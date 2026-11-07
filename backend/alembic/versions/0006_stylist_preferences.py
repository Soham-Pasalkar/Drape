"""Create stylist preferences and outfit feedback tables.

Revision ID: 0006_stylist_preferences
Revises: 0005_wardrobe_and_outfits
Create Date: 2026-11-08 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0006_stylist_preferences'
down_revision: Union[str, None] = '0005_wardrobe_and_outfits'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. stylist_preferences table
    op.create_table(
        'stylist_preferences',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('style_direction', sa.String(length=64), server_default='contemporary_minimal', nullable=False),
        sa.Column('favorite_occasions', sa.JSON(), server_default='[]', nullable=False),
        sa.Column('favorite_colors', sa.JSON(), server_default='[]', nullable=False),
        sa.Column('excluded_colors', sa.JSON(), server_default='[]', nullable=False),
        sa.Column('preferred_season', sa.String(length=50), server_default='all-season', nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', name='uq_stylist_preferences_user_id'),
    )
    op.create_index('ix_stylist_preferences_user_id', 'stylist_preferences', ['user_id'], unique=True)

    # 2. outfit_feedback table
    op.create_table(
        'outfit_feedback',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('outfit_id', sa.String(length=36), nullable=True),
        sa.Column('recommendation_hash', sa.String(length=128), nullable=True),
        sa.Column('action', sa.String(length=32), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['outfit_id'], ['outfits.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_outfit_feedback_user_id', 'outfit_feedback', ['user_id'], unique=False)
    op.create_index('ix_outfit_feedback_outfit_id', 'outfit_feedback', ['outfit_id'], unique=False)
    op.create_index('ix_outfit_feedback_recommendation_hash', 'outfit_feedback', ['recommendation_hash'], unique=False)
    op.create_index('ix_outfit_feedback_action', 'outfit_feedback', ['action'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_outfit_feedback_action', table_name='outfit_feedback')
    op.drop_index('ix_outfit_feedback_recommendation_hash', table_name='outfit_feedback')
    op.drop_index('ix_outfit_feedback_outfit_id', table_name='outfit_feedback')
    op.drop_index('ix_outfit_feedback_user_id', table_name='outfit_feedback')
    op.drop_table('outfit_feedback')

    op.drop_index('ix_stylist_preferences_user_id', table_name='stylist_preferences')
    op.drop_table('stylist_preferences')
