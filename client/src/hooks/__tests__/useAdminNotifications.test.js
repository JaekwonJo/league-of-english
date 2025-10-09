import { renderHook, act } from '@testing-library/react';
import { useAdminNotifications } from '../useAdminNotifications';
import { api } from '../../services/api.service';

jest.mock('../../services/api.service', () => {
  const listMock = jest.fn();
  const updateMock = jest.fn();
  return {
    api: {
      admin: {
        notifications: {
          list: listMock,
          update: updateMock
        }
      }
    }
  };
});

const mockedApi = api.admin.notifications;

describe('useAdminNotifications', () => {
  beforeEach(() => {
    mockedApi.list.mockReset();
    mockedApi.update.mockReset();
  });

  it('fetches notifications', async () => {
    mockedApi.list.mockResolvedValue({
      notifications: [
        { id: 1, type: 'problem_feedback.report', createdAt: '2024-01-01T00:00:00Z' }
      ]
    });

    const { result } = renderHook(() => useAdminNotifications());

    await act(async () => {
      await result.current.fetchNotifications();
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(mockedApi.list).toHaveBeenCalledWith({ status: 'pending' });
  });

  it('updates a notification status', async () => {
    mockedApi.list.mockResolvedValue({ notifications: [{ id: 9, type: 'problem_feedback.report' }] });
    mockedApi.update.mockResolvedValue({});

    const { result } = renderHook(() => useAdminNotifications());

    await act(async () => {
      await result.current.fetchNotifications();
    });

    await act(async () => {
      await result.current.updateNotification(9, 'acknowledged');
    });

    expect(mockedApi.update).toHaveBeenCalledWith(9, { status: 'acknowledged' });
    expect(result.current.notifications).toHaveLength(0);
  });
});
