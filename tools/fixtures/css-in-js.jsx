/*
 * Fixture: CSS-in-JS. The region-based scanner only sees CSS where CSS actually
 * lives, and a tagged template is one of those places. Without it a .jsx file
 * scans as if it contained no styles at all, which is worse than not claiming
 * to support the extension. tools/selftest.mjs asserts the counts.
 */
import styled from 'styled-components';

export const Card = styled.div`
  border-radius: 16px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  &:focus { outline: none; }
`;

export const Chained = styled.div.attrs({ role: 'note' })`
  border-radius: 4px;
`;

export const Aliased = tw.section`
  box-shadow: 0 6px 18px #1c1915;
`;

export const Inline = () => <div style={{ borderRadius: 8, boxShadow: '0 4px 12px #000' }} />;
