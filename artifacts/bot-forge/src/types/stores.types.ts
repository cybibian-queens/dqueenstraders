// @ts-nocheck
import { TStores } from '@deriv/stores/types';
import DashboardStore from '@/stores/dashboard-store';
import FlyoutStore from '@/stores/flyout-store';
import LoadModalStore from '@/stores/load-modal-store';
import RunPanelStore from '@/stores/run-panel-store';
import SaveModalStore from '@/stores/save-modal-store';
import ToolbarStore from '@/stores/toolbar-store';
import { TWebSocket } from './ws.types';

export type TDbotStore = {
    client: TStores['client'];
    flyout: FlyoutStore;
    toolbar: ToolbarStore;
    save_modal: SaveModalStore;
    dashboard: DashboardStore;
    load_modal: LoadModalStore;
    run_panel: RunPanelStore;
    setLoading: (is_loading: boolean) => void;
    setContractUpdateConfig: (contract_update_config: unknown) => void;
    handleFileChange: (
        event: React.MouseEvent<Element, MouseEvent> | React.FormEvent<HTMLFormElement> | DragEvent,
        is_body?: boolean
    ) => boolean;
    is_mobile: boolean;
};

export type TApiHelpersStore = {
    server_time: TStores['common']['server_time'];
    ws: TWebSocket;
};
