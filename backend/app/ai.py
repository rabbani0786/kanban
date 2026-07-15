import os

import anthropic
from sqlmodel import Session

from app import crud
from app.models import Board, Card, Column

MODEL = "claude-sonnet-5"
MAX_TOOL_ITERATIONS = 6


class AIConfigurationError(Exception):
    pass

SYSTEM_PROMPT = (
    "You are an assistant embedded in a Kanban board app. You can create cards, "
    "edit a card's title or details, and move cards between columns using the "
    "tools provided. Refer to cards and columns by their visible titles, exactly "
    "as the user gives them. After making changes, briefly confirm what you did "
    "in plain language."
)

TOOLS = [
    {
        "name": "create_card",
        "description": (
            "Create a new card in a column. Call this when the user asks to add, "
            "create, or make a new card or task."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "column_title": {
                    "type": "string",
                    "description": "The exact title of the column to add the card to (e.g. 'To Do').",
                },
                "title": {"type": "string", "description": "The card's title."},
                "details": {
                    "type": "string",
                    "description": "Optional longer description for the card.",
                },
            },
            "required": ["column_title", "title"],
        },
    },
    {
        "name": "edit_card",
        "description": (
            "Edit an existing card's title and/or details. Call this when the user "
            "asks to rename, update, or change the description of a card."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "card_title": {
                    "type": "string",
                    "description": "The current title of the card to edit.",
                },
                "new_title": {"type": "string", "description": "The new title, if changing it."},
                "new_details": {
                    "type": "string",
                    "description": "The new details text, if changing it.",
                },
            },
            "required": ["card_title"],
        },
    },
    {
        "name": "move_card",
        "description": (
            "Move an existing card to a different column. Call this when the user "
            "asks to move, shift, or reassign a card to another column."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "card_title": {"type": "string", "description": "The title of the card to move."},
                "to_column_title": {
                    "type": "string",
                    "description": "The exact title of the column to move the card into.",
                },
            },
            "required": ["card_title", "to_column_title"],
        },
    },
]


def _find_column(board: Board, title: str) -> Column | None:
    normalized = title.strip().lower()
    for column in board.columns:
        if column.title.strip().lower() == normalized:
            return column
    return None


def _find_card(board: Board, title: str) -> Card | None:
    normalized = title.strip().lower()
    for column in board.columns:
        for card in column.cards:
            if card.title.strip().lower() == normalized:
                return card
    return None


def _run_tool(session: Session, board_id: int, name: str, tool_input: dict) -> tuple[str, bool]:
    board = crud.get_board(session, board_id)

    if name == "create_card":
        column = _find_column(board, tool_input["column_title"])
        if column is None:
            return f"No column titled '{tool_input['column_title']}' found.", True
        card = crud.create_card(
            session, board_id, column.id, tool_input["title"], tool_input.get("details", "")
        )
        return f"Created card '{card.title}' in column '{column.title}'.", False

    if name == "edit_card":
        card = _find_card(board, tool_input["card_title"])
        if card is None:
            return f"No card titled '{tool_input['card_title']}' found.", True
        updated = crud.update_card(
            session,
            board_id,
            card.id,
            tool_input.get("new_title"),
            tool_input.get("new_details"),
        )
        return f"Updated card '{updated.title}'.", False

    if name == "move_card":
        card = _find_card(board, tool_input["card_title"])
        if card is None:
            return f"No card titled '{tool_input['card_title']}' found.", True
        column = _find_column(board, tool_input["to_column_title"])
        if column is None:
            return f"No column titled '{tool_input['to_column_title']}' found.", True
        moved = crud.move_card(session, board_id, card.id, column.id, len(column.cards))
        return f"Moved card '{moved.title}' to column '{column.title}'.", False

    return f"Unknown tool: {name}", True


def run_chat(session: Session, board_id: int, user_message: str) -> str:
    if not os.environ.get("ANTHROPIC_API_KEY"):
        raise AIConfigurationError("ANTHROPIC_API_KEY is not configured.")

    client = anthropic.Anthropic()
    messages: list[dict] = [{"role": "user", "content": user_message}]

    for _ in range(MAX_TOOL_ITERATIONS):
        response = client.messages.create(
            model=MODEL,
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            tools=TOOLS,
            messages=messages,
        )

        if response.stop_reason != "tool_use":
            return "".join(block.text for block in response.content if block.type == "text")

        messages.append({"role": "assistant", "content": response.content})

        tool_results = []
        for block in response.content:
            if block.type != "tool_use":
                continue
            result_text, is_error = _run_tool(session, board_id, block.name, block.input)
            tool_results.append(
                {
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": result_text,
                    "is_error": is_error,
                }
            )
        messages.append({"role": "user", "content": tool_results})

    return "I made some changes but ran out of steps before finishing. Please check the board."


ADVICE_SYSTEM_PROMPT = (
    "You are a workflow advisor for a Kanban board. Given a list of current "
    "bottlenecks (stale cards and overloaded columns), give a short, concrete "
    "recommendation in 2-4 sentences on what to do about them. Reference card and "
    "column titles by name. If there are no bottlenecks, say the board looks healthy."
)


def generate_bottleneck_advice(bottleneck_messages: list[str]) -> str:
    if not os.environ.get("ANTHROPIC_API_KEY"):
        raise AIConfigurationError("ANTHROPIC_API_KEY is not configured.")

    if bottleneck_messages:
        user_content = "Current bottlenecks:\n" + "\n".join(
            f"- {message}" for message in bottleneck_messages
        )
    else:
        user_content = "There are currently no bottlenecks on the board."

    client = anthropic.Anthropic()
    response = client.messages.create(
        model=MODEL,
        max_tokens=300,
        system=ADVICE_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_content}],
    )
    return "".join(block.text for block in response.content if block.type == "text")
