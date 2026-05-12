import psutil
import asyncio
from typing import Dict, Any, List
from datetime import datetime


def get_cpu_info() -> Dict[str, Any]:
    freq = psutil.cpu_freq()
    return {
        "percent": psutil.cpu_percent(interval=0.1),
        "cores": psutil.cpu_count(logical=False),
        "threads": psutil.cpu_count(logical=True),
        "frequency_mhz": round(freq.current, 1) if freq else 0,
        "frequency_max_mhz": round(freq.max, 1) if freq else 0,
    }


def get_ram_info() -> Dict[str, Any]:
    mem = psutil.virtual_memory()
    swap = psutil.swap_memory()
    return {
        "total_gb": round(mem.total / 1e9, 2),
        "available_gb": round(mem.available / 1e9, 2),
        "used_gb": round(mem.used / 1e9, 2),
        "percent": mem.percent,
        "swap_total_gb": round(swap.total / 1e9, 2),
        "swap_used_gb": round(swap.used / 1e9, 2),
        "swap_percent": swap.percent,
    }


def get_disk_info() -> Dict[str, Any]:
    disk = psutil.disk_usage("/")
    return {
        "total_gb": round(disk.total / 1e9, 2),
        "used_gb": round(disk.used / 1e9, 2),
        "free_gb": round(disk.free / 1e9, 2),
        "percent": disk.percent,
    }


def get_gpu_info() -> List[Dict[str, Any]]:
    try:
        import GPUtil
        gpus = GPUtil.getGPUs()
        return [
            {
                "id": gpu.id,
                "name": gpu.name,
                "load_percent": round(gpu.load * 100, 1),
                "memory_used_mb": round(gpu.memoryUsed, 1),
                "memory_total_mb": round(gpu.memoryTotal, 1),
                "memory_percent": round(gpu.memoryUtil * 100, 1),
                "temperature_c": gpu.temperature,
            }
            for gpu in gpus
        ]
    except Exception:
        return []


def get_network_info() -> Dict[str, Any]:
    net = psutil.net_io_counters()
    return {
        "bytes_sent_mb": round(net.bytes_sent / 1e6, 2),
        "bytes_recv_mb": round(net.bytes_recv / 1e6, 2),
        "packets_sent": net.packets_sent,
        "packets_recv": net.packets_recv,
    }


async def get_full_system_stats() -> Dict[str, Any]:
    loop = asyncio.get_event_loop()
    cpu = await loop.run_in_executor(None, get_cpu_info)
    ram = await loop.run_in_executor(None, get_ram_info)
    disk = await loop.run_in_executor(None, get_disk_info)
    gpu = await loop.run_in_executor(None, get_gpu_info)
    net = await loop.run_in_executor(None, get_network_info)

    return {
        "cpu": cpu,
        "ram": ram,
        "disk": disk,
        "gpu": gpu,
        "network": net,
        "timestamp": datetime.utcnow().isoformat(),
    }
