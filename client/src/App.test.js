import { render, screen } from '@testing-library/react';
import App from './App';

test('renders initial loading message', () => {
  render(<App />);
  expect(screen.getByText(/League of English/i)).toBeInTheDocument();
});
