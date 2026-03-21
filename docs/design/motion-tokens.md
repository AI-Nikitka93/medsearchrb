# Motion Tokens

- Library: `Framer Motion` или нативный CSS transition для MVP.
- Entrance:
  - home hero: `220ms`, `var(--ease-standard)`, translateY 8px -> 0
  - doctor card list: stagger `40ms`
- Hover/press:
  - press scale: `0.98`
  - duration: `140ms`
- CTA:
  - sticky bar reveal: `220ms`
- Budget:
  - не блокировать LCP;
  - не создавать CLS > `0.1`;
  - shimmer only once, not infinite.
