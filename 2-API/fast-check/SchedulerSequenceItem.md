[Home](/) &gt; [fast-check](../fast-check.md) &gt; [SchedulerSequenceItem](SchedulerSequenceItem.md)

## SchedulerSequenceItem type

Define an item to be passed to `scheduleSequence`

<b>Signature:</b>

```typescript
export declare type SchedulerSequenceItem = {
    builder: () => Promise<any>;
    label: string;
} | (() => Promise<any>);
```
