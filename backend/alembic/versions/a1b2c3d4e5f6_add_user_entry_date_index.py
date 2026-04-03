"""add_user_entry_date_index

Revision ID: a1b2c3d4e5f6
Revises: ce2db5fe1584
Create Date: 2026-04-03 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'ce2db5fe1584'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index(
        'ix_user_entry_date',
        'user_vitamin_entries',
        ['user_id', 'entry_date'],
    )


def downgrade() -> None:
    op.drop_index('ix_user_entry_date', table_name='user_vitamin_entries')
