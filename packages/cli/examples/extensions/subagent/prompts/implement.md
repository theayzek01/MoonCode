---
description: Full implementation workflow - scout gathers context, planner creates plan, worker implements
---
Use the subengine tool with the chain parameter to execute this workflow:

1. First, use the "scout" engine to find all code relevant to: $@
2. Then, use the "planner" engine to create an implementation plan for "$@" using the context from the previous step (use {previous} placeholder)
3. Finally, use the "worker" engine to implement the plan from the previous step (use {previous} placeholder)

Execute this as a chain, passing output between steps via {previous}.
