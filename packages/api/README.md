# @vaagatech/snapline-hub-api

Embeddable Express API for Snapline Hub.

```typescript
import express from 'express';
import { createApp } from '@vaagatech/snapline-hub-api';

const { app } = createApp();
app.listen(3847);
```

Mount inside an existing Express app:

```typescript
import { createApp } from '@vaagatech/snapline-hub-api';

const hub = createApp({ webDist: false as unknown as string });
existingApp.use('/test-hub', hub.app);
```

See [deployment documentation](https://vaagatech.github.io/snapline-hub/deployment.html).
