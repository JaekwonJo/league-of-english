import { render, screen, fireEvent } from '@testing-library/react';
import StudyConfig from '../StudyConfig';
import useStudyConfig from '../hooks/useStudyConfig';

jest.mock('../hooks/useStudyConfig');
jest.mock('../components/DocumentStep', () => () => <div data-testid="document-step" />);
jest.mock('../components/PassageStep', () => () => <div data-testid="passage-step" />);
jest.mock('../components/ProblemTypeStep', () => () => <div data-testid="problem-step" />);

const mockUseStudyConfig = useStudyConfig;

describe('StudyConfig saved session banner', () => {
  beforeEach(() => {
    mockUseStudyConfig.mockReturnValue({
      step: 1,
      safeStep: 1,
      documents: [],
      documentsLoading: false,
      passages: [],
      passagesLoading: false,
      selectedPassages: [],
      previewPassage: null,
      error: null,
      config: { documentId: null, types: {}, orderMode: 'random' },
      totalProblems: 0,
      goToStep: jest.fn(),
      selectDocument: jest.fn(),
      togglePassageSelection: jest.fn(),
      selectAllPassages: jest.fn(),
      clearPassages: jest.fn(),
      randomPassages: jest.fn(),
      openPreview: jest.fn(),
      closePreview: jest.fn(),
      handleTypeChange: jest.fn(),
      changeTypeByStep: jest.fn(),
      randomizeTypes: jest.fn(),
      resetTypes: jest.fn(),
      changeOrderMode: jest.fn(),
      prepareTypeStep: jest.fn(),
      handleStart: jest.fn(),
      renderPassageMeta: jest.fn()
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('shows saved session card and responds to actions', async () => {
    const resumeMock = jest.fn().mockResolvedValue(true);
    const discardMock = jest.fn();
    const originalConfirm = global.confirm;
    global.confirm = jest.fn().mockReturnValue(true);

    render(
      <StudyConfig
        onStart={jest.fn()}
        savedSession={{
          problems: Array.from({ length: 5 }).map((_, idx) => ({ id: idx + 1 })),
          timeLeft: 180,
          savedAt: Date.now()
        }}
        onResumeSavedSession={resumeMock}
        onDiscardSavedSession={discardMock}
      />
    );

    expect(screen.getByText(/저장된 학습 이어하기/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '이어서 풀기' }));
    expect(resumeMock).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: '삭제' }));
    expect(global.confirm).toHaveBeenCalled();
    expect(discardMock).toHaveBeenCalledTimes(1);

    global.confirm = originalConfirm;
  });
});
