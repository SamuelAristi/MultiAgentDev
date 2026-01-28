# Agent Workers Package
#
# The system now uses a fully dynamic architecture where all agents
# are configured from the database. The configurable_worker is the
# only worker needed - it reads agent config from DB and handles
# sub-agent orchestration automatically.
#
# Legacy static workers (echo, tiktok, amazon, web, email) are kept
# for backwards compatibility but are no longer used in production.

from app.agents.workers.configurable import configurable_worker

__all__ = [
    "configurable_worker",
]
