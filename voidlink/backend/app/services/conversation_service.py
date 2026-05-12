from typing import List, Optional
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.conversation import Conversation, Message, Folder


async def create_conversation(db: AsyncSession, user_id: int, model: str, title: str = "New Chat", folder_id: int = None, system_prompt: str = None) -> Conversation:
    conv = Conversation(
        user_id=user_id,
        model=model,
        title=title,
        folder_id=folder_id,
        system_prompt=system_prompt,
    )
    db.add(conv)
    await db.commit()
    await db.refresh(conv)
    return conv


async def get_conversation(db: AsyncSession, conv_id: int, user_id: int) -> Optional[Conversation]:
    result = await db.execute(
        select(Conversation)
        .options(selectinload(Conversation.messages))
        .where(Conversation.id == conv_id, Conversation.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def list_conversations(db: AsyncSession, user_id: int, folder_id: Optional[int] = None, limit: int = 50, offset: int = 0) -> List[Conversation]:
    q = select(Conversation).where(Conversation.user_id == user_id)
    if folder_id is not None:
        q = q.where(Conversation.folder_id == folder_id)
    q = q.order_by(desc(Conversation.updated_at), desc(Conversation.created_at)).limit(limit).offset(offset)
    result = await db.execute(q)
    return result.scalars().all()


async def update_conversation_title(db: AsyncSession, conv_id: int, user_id: int, title: str) -> Optional[Conversation]:
    result = await db.execute(
        select(Conversation).where(Conversation.id == conv_id, Conversation.user_id == user_id)
    )
    conv = result.scalar_one_or_none()
    if conv:
        conv.title = title
        await db.commit()
        await db.refresh(conv)
    return conv


async def delete_conversation(db: AsyncSession, conv_id: int, user_id: int) -> bool:
    result = await db.execute(
        select(Conversation).where(Conversation.id == conv_id, Conversation.user_id == user_id)
    )
    conv = result.scalar_one_or_none()
    if conv:
        await db.delete(conv)
        await db.commit()
        return True
    return False


async def add_message(db: AsyncSession, conv_id: int, role: str, content: str, model: str = None, tokens: int = 0, attachments: list = None) -> Message:
    msg = Message(
        conversation_id=conv_id,
        role=role,
        content=content,
        model=model,
        tokens=tokens,
        attachments=attachments,
    )
    db.add(msg)

    result = await db.execute(select(Conversation).where(Conversation.id == conv_id))
    conv = result.scalar_one_or_none()
    if conv:
        conv.total_tokens = (conv.total_tokens or 0) + tokens

    await db.commit()
    await db.refresh(msg)
    return msg


async def get_messages_for_context(db: AsyncSession, conv_id: int, max_tokens: int = 4000) -> List[Message]:
    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conv_id)
        .order_by(Message.created_at)
    )
    messages = result.scalars().all()

    # Trim from oldest to stay within context
    total = 0
    trimmed = []
    for msg in reversed(messages):
        approx_tokens = len(msg.content.split()) * 1.3
        if total + approx_tokens > max_tokens:
            break
        trimmed.insert(0, msg)
        total += approx_tokens

    return trimmed


async def create_folder(db: AsyncSession, user_id: int, name: str, color: str = "#00ff88") -> Folder:
    folder = Folder(user_id=user_id, name=name, color=color)
    db.add(folder)
    await db.commit()
    await db.refresh(folder)
    return folder


async def list_folders(db: AsyncSession, user_id: int) -> List[Folder]:
    result = await db.execute(
        select(Folder).where(Folder.user_id == user_id).order_by(Folder.name)
    )
    return result.scalars().all()


async def delete_folder(db: AsyncSession, folder_id: int, user_id: int) -> bool:
    result = await db.execute(
        select(Folder).where(Folder.id == folder_id, Folder.user_id == user_id)
    )
    folder = result.scalar_one_or_none()
    if folder:
        await db.execute(
            select(Conversation).where(Conversation.folder_id == folder_id)
        )
        await db.delete(folder)
        await db.commit()
        return True
    return False
