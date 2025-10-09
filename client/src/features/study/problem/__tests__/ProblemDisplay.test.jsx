import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ProblemDisplay from '../ProblemDisplay';

jest.mock('../../../../services/api.service', () => {
  const summaryMock = jest.fn().mockResolvedValue({
    counts: { like: 1, report: 0 },
    user: { like: false, report: false }
  });
  const submitMock = jest.fn().mockResolvedValue({
    summary: {
      counts: { like: 2, report: 0 },
      user: { like: true, report: false }
    }
  });

  return {
    api: {
      problems: {
        feedback: {
          summary: summaryMock,
          submit: submitMock
        }
      }
    }
  };
});

const {
  api: {
    problems: {
      feedback: feedbackApi
    }
  }
} = jest.requireMock('../../../../services/api.service');

const baseProblem = {
  id: 101,
  type: 'blank',
  question: 'Fill in the blank ____.',
  options: ['① option A', '② option B', '③ option C', '④ option D', '⑤ option E'],
  answer: '①',
  explanation: '정답은 option A 입니다.',
  metadata: {}
};

describe('ProblemDisplay feedback controls', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders feedback buttons and submits like action', async () => {
    render(
      <ProblemDisplay
        problem={baseProblem}
        problemIndex={0}
        totalProblems={5}
        onAnswer={jest.fn()}
        displayMode="single"
        timeElapsed={0}
      />
    );

    await waitFor(() => expect(feedbackApi.summary).toHaveBeenCalledWith(baseProblem.id));

    const likeButton = screen.getByRole('button', { name: /좋아요/ });
    expect(likeButton).toBeInTheDocument();

    fireEvent.click(likeButton);

    await waitFor(() => expect(feedbackApi.submit).toHaveBeenCalledWith(baseProblem.id, { action: 'like', reason: undefined }));
  });
});
