declare global {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let google: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let Blockly: any;
    interface Window {
        sendRequestsStatistic: (is_running: boolean) => void;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Blockly: any;
    }
}

export {};
