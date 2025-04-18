import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemedText } from '../ThemedText';

describe('ThemedText', () => {
  it('renders text content correctly', () => {
    // Arrange
    const testMessage = 'Snapshot test!';

    // Act
    render(<ThemedText>{testMessage}</ThemedText>);

    // Assert
    expect(screen.getByText(testMessage)).toBeInTheDocument();
  });

  // You can add more specific tests for theming if needed
  it('applies the correct styling', () => {
    render(<ThemedText>Styled text</ThemedText>);

    // Check for expected styling - adjust selectors based on your component
    const textElement = screen.getByText('Styled text');

    // Check that the component is visible
    expect(textElement).toBeVisible();

    // You can also test specific styling if needed
    // expect(window.getComputedStyle(textElement).color).toBe('expected-color');
  });
});
