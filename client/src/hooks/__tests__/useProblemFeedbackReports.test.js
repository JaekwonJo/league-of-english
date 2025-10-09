import { renderHook, act } from '@testing-library/react';
import { useProblemFeedbackReports } from '../useProblemFeedbackReports';
import { api } from '../../services/api.service';

jest.mock('../../services/api.service', () => {
  const listMock = jest.fn();
  const updateMock = jest.fn();
  return {
    api: {
      admin: {
        problemFeedback: {
          list: listMock,
          update: updateMock
        }
      }
    }
  };
});

const mockedApi = api.admin.problemFeedback;

describe('useProblemFeedbackReports', () => {
  beforeEach(() => {
    mockedApi.list.mockReset();
    mockedApi.update.mockReset();
  });

  it('fetches and stores problem feedback reports', async () => {
    mockedApi.list.mockResolvedValue({
      reports: [
        {
          id: 1,
          status: 'pending',
          reason: '보기 오류'
        }
      ],
      summary: { pending: 1 }
    });

    const { result } = renderHook(() => useProblemFeedbackReports());

    await act(async () => {
      await result.current.fetchReports();
    });

    expect(result.current.reports).toHaveLength(1);
    expect(result.current.summary.pending).toBe(1);
  });

  it('updates report status and adjusts summary counts', async () => {
    mockedApi.list.mockResolvedValue({
      reports: [
        { id: 42, status: 'pending', reason: '틀린 정답' }
      ],
      summary: { pending: 1 }
    });
    mockedApi.update.mockResolvedValue({});

    const { result } = renderHook(() => useProblemFeedbackReports());

    await act(async () => {
      await result.current.fetchReports();
    });

    await act(async () => {
      await result.current.updateStatus(42, 'resolved');
    });

    expect(mockedApi.update).toHaveBeenCalledWith(42, {
      status: 'resolved',
      resolutionNote: undefined
    });
    expect(result.current.reports).toHaveLength(0);
    expect(result.current.summary.pending).toBe(0);
    expect(result.current.summary.resolved).toBe(1);
  });
});
