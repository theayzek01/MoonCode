---
description: Worker implements, reviewer reviews, worker applies feedback
---
Use the subengine tool with the chain parameter to execute this workflow:

1. First, use the "worker" engine to implement: $@
2. Then, use the "reviewer" engine to review the implementation from the previous step (use {previous} placeholder)
3. Finally, use the "worker" engine to apply the feedback from the review (use {previous} placeholder)

Execute this as a chain, passing output between steps via {previous}.
