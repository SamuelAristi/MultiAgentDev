# Dynamic Agent System
#
# All agents are now loaded from the database.
# The system uses configurable_worker which reads agent config from DB
# and supports sub-agent orchestration.
#
# Legacy copy_supervisor.py is deprecated - all routing is now dynamic.

from app.agents.supervisor import agent_graph, run_agent

__all__ = [
    "agent_graph",
    "run_agent",
]
