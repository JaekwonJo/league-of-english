import { render, screen, fireEvent } from '@testing-library/react';
import ResultCard from '../ResultCard';

describe('ResultCard component', () => {
  it('renders summary info and triggers action callbacks', () => {
    const reviewMock = jest.fn();
    const restartMock = jest.fn();
    const homeMock = jest.fn();

    render(
      <ResultCard
        resultInfo={{ grade: 'A', bgColor: 'blue', message: '잘했어요!', emoji: '🎉' }}
        summary={{
          accuracy: 92,
          totalCorrect: 4,
          totalIncorrect: 1,
          totalTimeSeconds: 180,
          totalPoints: 1200,
          pointsDelta: 30
        }}
        tierInfo={{ id: 'gold', color: '#ffd700', nameKr: '골드', icon: '⭐' }}
        userPoints={1200}
        currentLpCount={30}
        perTypeStats={[{ type: 'blank', correct: 3, incorrect: 1, accuracy: 75 }]}
        detailResults={[{ isCorrect: true, userAnswer: '①', correctAnswer: '①', timeSpent: 25 }]}
        formatTypeLabel={(type) => type}
        formatLpDelta={(value) => (value > 0 ? `+${value}` : `${value}`)}
        onReview={reviewMock}
        onRestart={restartMock}
        onHome={homeMock}
      />
    );

    expect(screen.getByText(/잘했어요!/)).toBeInTheDocument();
    expect(screen.getByText('4개')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /해설보기/ }));
    fireEvent.click(screen.getByRole('button', { name: /다시 풀기/ }));
    fireEvent.click(screen.getByRole('button', { name: /홈으로/ }));

    expect(reviewMock).toHaveBeenCalledTimes(1);
    expect(restartMock).toHaveBeenCalledTimes(1);
    expect(homeMock).toHaveBeenCalledTimes(1);
  });
});
