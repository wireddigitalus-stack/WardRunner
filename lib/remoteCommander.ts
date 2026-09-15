import { supabase } from './supabaseClient';

export type LiveMode = 'off' | 'commander' | 'display';

export type CommandAction =
  | {
      type: 'CAMERA_MOVE';
      center: [number, number];
      zoom: number;
      pitch: number;
      bearing: number;
      duration?: number;
    }
  | {
      type: 'LAYER_TOGGLE';
      layer: 'signs' | 'corridors' | 'heatmap' | 'precincts' | 'boundary' | 'missions' | 'canvass' | 'field_ops' | 'minimap';
      active: boolean;
    }
  | {
      type: 'FILTER_VOLUNTEER';
      volunteerName: string | null;
      volunteerGroup?: string | null;
    }
  | {
      type: 'SELECT_SIGN';
      signId: string | null;
    }
  | {
      type: 'SELECT_MISSION';
      missionId: string | null;
    }
  | {
      type: 'SELECT_PRECINCT';
      precinctCode: string | null;
    }
  | {
      type: 'TRIGGER_ORBIT';
      active: boolean;
    }
  | {
      type: 'TOUR_SYNC';
      isOpen: boolean;
      stepIndex?: number;
    }
  | {
      type: 'HEARTBEAT';
      sender: 'commander' | 'display';
      timestamp: number;
    };

export interface RemoteSessionState {
  mode: LiveMode;
  room: string;
  connectedCount: number;
  lastActive: number;
}

const DEFAULT_ROOM = 'campaignos_war_room_sync';

/**
 * Initialize a Supabase Realtime Broadcast Channel for War Room Sync
 */
export function initRemoteChannel(
  mode: LiveMode,
  onAction: (action: CommandAction) => void,
  onStatusChange?: (status: 'connected' | 'connecting' | 'disconnected') => void,
  room: string = DEFAULT_ROOM
) {
  if (mode === 'off' || typeof window === 'undefined') {
    return {
      sendAction: () => {},
      disconnect: () => {},
    };
  }

  const channel = supabase.channel(room, {
    config: {
      broadcast: { self: false },
    },
  });

  channel
    .on('broadcast', { event: 'war_room_action' }, (response: any) => {
      if (response && response.payload) {
        onAction(response.payload as CommandAction);
      }
    })
    .subscribe((status: string) => {
      if (status === 'SUBSCRIBED') {
        onStatusChange?.('connected');
        // Announce presence
        channel.send({
          type: 'broadcast',
          event: 'war_room_action',
          payload: {
            type: 'HEARTBEAT',
            sender: mode === 'commander' ? 'commander' : 'display',
            timestamp: Date.now(),
          },
        });
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        onStatusChange?.('disconnected');
      } else {
        onStatusChange?.('connecting');
      }
    });

  const sendAction = (action: CommandAction) => {
    if (mode !== 'commander') return;
    channel.send({
      type: 'broadcast',
      event: 'war_room_action',
      payload: action,
    });
  };

  const disconnect = () => {
    try {
      supabase.removeChannel(channel);
    } catch {}
  };

  return {
    sendAction,
    disconnect,
  };
}
