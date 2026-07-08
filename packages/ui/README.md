# @vaagatech/snapline-hub-ui

Embeddable React dashboard for Snapline Hub.

```tsx
import { HubApp } from '@vaagatech/snapline-hub-ui';
import '@vaagatech/snapline-hub-ui/style.css';

export function ReportsSection() {
  return (
    <HubApp
      apiBase="https://hub.example.com/api"
      basename="/quality"
      user="alice@company.com"
    />
  );
}
```

See [embedding documentation](https://vaagatech.github.io/snapline-hub/embedding.html).
