#!/usr/bin/env python3
"""email_info.py — OSINT/recon CLI for a single email address.

For authorized penetration testing and security assessments only.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import smtplib
import socket
import sys
from dataclasses import asdict, dataclass, field
from typing import Optional

try:
    import dns.resolver  # type: ignore
    import dns.exception  # type: ignore
    _HAVE_DNS = True
except ImportError:
    _HAVE_DNS = False


EMAIL_RE = re.compile(
    r"^(?P<local>[A-Za-z0-9!#$%&'*+/=?^_`{|}~.-]+)"
    r"@(?P<domain>(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+"
    r"[A-Za-z]{2,63})$"
)

FREE_PROVIDERS = {
    "gmail.com", "googlemail.com", "yahoo.com", "ymail.com", "outlook.com",
    "hotmail.com", "live.com", "msn.com", "icloud.com", "me.com", "mac.com",
    "aol.com", "proton.me", "protonmail.com", "pm.me", "gmx.com", "gmx.de",
    "zoho.com", "yandex.com", "yandex.ru", "mail.ru", "tutanota.com",
    "fastmail.com", "hey.com",
}

DISPOSABLE_PROVIDERS = {
    "mailinator.com", "guerrillamail.com", "10minutemail.com", "tempmail.com",
    "temp-mail.org", "throwaway.email", "yopmail.com", "dispostable.com",
    "trashmail.com", "sharklasers.com", "getnada.com", "maildrop.cc",
    "mohmal.com", "mailnesia.com", "fakeinbox.com", "mintemail.com",
    "mailtm.com", "mail.tm", "1secmail.com", "1secmail.net", "1secmail.org",
    "emailondeck.com", "burnermail.io", "tempr.email", "inboxbear.com",
}


@dataclass
class Report:
    email: str
    valid_syntax: bool
    local: Optional[str] = None
    domain: Optional[str] = None
    is_free_provider: Optional[bool] = None
    is_disposable: Optional[bool] = None
    gravatar_url: Optional[str] = None
    mx_records: list[str] = field(default_factory=list)
    a_records: list[str] = field(default_factory=list)
    spf: Optional[str] = None
    dmarc: Optional[str] = None
    mta_sts: Optional[bool] = None
    smtp_check: Optional[dict] = None
    errors: list[str] = field(default_factory=list)


def _resolve(name: str, rtype: str) -> list[str]:
    if not _HAVE_DNS:
        return []
    try:
        answers = dns.resolver.resolve(name, rtype, lifetime=5.0)
    except (dns.resolver.NoAnswer, dns.resolver.NXDOMAIN,
            dns.resolver.NoNameservers, dns.exception.Timeout):
        return []
    out = []
    for r in answers:
        if rtype == "MX":
            out.append(f"{r.preference} {r.exchange.to_text().rstrip('.')}")
        elif rtype == "TXT":
            parts = [p.decode() if isinstance(p, bytes) else p for p in r.strings]
            out.append("".join(parts))
        else:
            out.append(r.to_text())
    return out


def _gravatar_url(email: str) -> str:
    digest = hashlib.sha256(email.strip().lower().encode()).hexdigest()
    return f"https://www.gravatar.com/avatar/{digest}?d=404"


def _smtp_probe(email: str, mx_host: str, sender: str, timeout: float = 10.0) -> dict:
    result: dict = {"mx": mx_host, "deliverable": None, "code": None, "message": None}
    try:
        with smtplib.SMTP(mx_host, 25, timeout=timeout) as s:
            s.ehlo_or_helo_if_needed()
            code, msg = s.mail(sender)
            if code >= 400:
                result.update(code=code, message=msg.decode(errors="replace"),
                              deliverable=False)
                return result
            code, msg = s.rcpt(email)
            result["code"] = code
            result["message"] = msg.decode(errors="replace")
            if code in (250, 251):
                result["deliverable"] = True
            elif code in (550, 551, 553):
                result["deliverable"] = False
            else:
                result["deliverable"] = None  # ambiguous (greylist, etc.)
    except (socket.timeout, socket.gaierror, ConnectionRefusedError,
            smtplib.SMTPException, OSError) as e:
        result["message"] = f"{type(e).__name__}: {e}"
    return result


def inspect(email: str, *, do_smtp: bool = False, sender: str = "probe@example.com") -> Report:
    rep = Report(email=email, valid_syntax=False)
    m = EMAIL_RE.match(email)
    if not m:
        rep.errors.append("invalid RFC-5322-ish syntax")
        return rep

    rep.valid_syntax = True
    rep.local = m.group("local")
    rep.domain = m.group("domain").lower()
    rep.is_free_provider = rep.domain in FREE_PROVIDERS
    rep.is_disposable = rep.domain in DISPOSABLE_PROVIDERS
    rep.gravatar_url = _gravatar_url(email)

    if not _HAVE_DNS:
        rep.errors.append("dnspython not installed; DNS checks skipped (pip install dnspython)")
        return rep

    rep.mx_records = sorted(_resolve(rep.domain, "MX"),
                            key=lambda s: int(s.split()[0]))
    rep.a_records = _resolve(rep.domain, "A")

    for txt in _resolve(rep.domain, "TXT"):
        if txt.lower().startswith("v=spf1"):
            rep.spf = txt
            break

    dmarc_txt = _resolve(f"_dmarc.{rep.domain}", "TXT")
    for txt in dmarc_txt:
        if txt.lower().startswith("v=dmarc1"):
            rep.dmarc = txt
            break

    rep.mta_sts = bool(_resolve(f"_mta-sts.{rep.domain}", "TXT"))

    if do_smtp:
        if not rep.mx_records:
            rep.smtp_check = {"error": "no MX records"}
        else:
            top_mx = rep.mx_records[0].split()[1]
            rep.smtp_check = _smtp_probe(email, top_mx, sender)

    return rep


def _render_text(rep: Report) -> str:
    lines = []
    lines.append(f"email          : {rep.email}")
    lines.append(f"valid syntax   : {rep.valid_syntax}")
    if not rep.valid_syntax:
        for e in rep.errors:
            lines.append(f"  ! {e}")
        return "\n".join(lines)
    lines.append(f"local / domain : {rep.local} / {rep.domain}")
    lines.append(f"free provider  : {rep.is_free_provider}")
    lines.append(f"disposable     : {rep.is_disposable}")
    lines.append(f"gravatar probe : {rep.gravatar_url}")
    lines.append(f"MX records     : {', '.join(rep.mx_records) or '(none)'}")
    lines.append(f"A records      : {', '.join(rep.a_records) or '(none)'}")
    lines.append(f"SPF            : {rep.spf or '(none)'}")
    lines.append(f"DMARC          : {rep.dmarc or '(none)'}")
    lines.append(f"MTA-STS TXT    : {rep.mta_sts}")
    if rep.smtp_check is not None:
        lines.append("SMTP probe     :")
        for k, v in rep.smtp_check.items():
            lines.append(f"  {k:<12}: {v}")
    for e in rep.errors:
        lines.append(f"  ! {e}")
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(
        prog="email_info",
        description="Gather recon info about an email address (authorized testing only).",
    )
    p.add_argument("email", help="target email address")
    p.add_argument("--smtp", action="store_true",
                   help="probe MX with RCPT TO (intrusive; many servers rate-limit or log)")
    p.add_argument("--sender", default="probe@example.com",
                   help="MAIL FROM address for the SMTP probe (default: probe@example.com)")
    p.add_argument("--json", action="store_true", help="emit JSON instead of text")
    args = p.parse_args(argv)

    rep = inspect(args.email, do_smtp=args.smtp, sender=args.sender)

    if args.json:
        print(json.dumps(asdict(rep), indent=2))
    else:
        print(_render_text(rep))

    return 0 if rep.valid_syntax else 1


if __name__ == "__main__":
    sys.exit(main())
