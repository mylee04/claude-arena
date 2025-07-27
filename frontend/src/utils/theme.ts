// Theme utility functions for Tailwind CSS v4
export const theme = {
  // Background colors
  bg: {
    primary: { backgroundColor: 'var(--color-bg)' },
    card: { backgroundColor: 'var(--color-card)' },
  },
  
  // Border colors
  border: {
    default: { borderColor: 'var(--color-border)' },
  },
  
  // Text colors
  text: {
    default: { color: 'var(--color-text)' },
    muted: { color: 'var(--color-text-muted)' },
    inverse: { color: 'var(--color-text-inverse)' },
    accent: {
      blue: { color: 'var(--color-accent-blue)' },
      purple: { color: 'var(--color-accent-purple)' },
      green: { color: 'var(--color-accent-green)' },
      yellow: { color: 'var(--color-accent-yellow)' },
      red: { color: 'var(--color-accent-red)' },
    },
  },
  
  // Gradient backgrounds
  gradient: {
    blueToPurple: {
      background: 'linear-gradient(to bottom right, var(--color-accent-blue), var(--color-accent-purple))'
    },
  },
  
  // Combined styles
  combined: {
    bgWithBorder: {
      backgroundColor: 'var(--color-bg)',
      borderColor: 'var(--color-border)',
    },
    cardWithBorder: {
      backgroundColor: 'var(--color-card)',
      borderColor: 'var(--color-border)',
    },
  }
};

// Helper function to combine multiple theme styles
export function combineStyles(...styles: React.CSSProperties[]): React.CSSProperties {
  return Object.assign({}, ...styles);
}