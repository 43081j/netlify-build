import { styleText } from 'node:util';

// Color theme. Please use this instead of requiring chalk directly, to ensure
// consistent colors.
export const THEME = {
  // Single lines used as subheaders
  subHeader: (str) => styleText(['cyan', 'bold'], str),
  // Single lines used as subheaders indicating an error
  errorSubHeader: (str) => styleText(['red', 'bold'], str),
  // Same for warnings
  warningLine: (str) => styleText('yellowBright', str),
  // One of several words that should be highlighted inside a line
  highlightWords: (str) => styleText('cyan', str),
}
