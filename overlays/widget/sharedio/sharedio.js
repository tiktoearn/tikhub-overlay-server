class SharedIO {
    constructor() {
        this.worker = new SharedWorker('/widget/sharedio/sharedioworker.js');
        this.worker.port.start();
        this.eventListener = [];
        this.connectTimeout = null;

        this.worker.port.onmessage = (e) => {
            let data = e.data;

            switch (data.name) {
                case "connectCallback":
                    console.info("[SharedIO] Connected!", data.params);
                    if (this.connectTimeout) {
                        clearTimeout(this.connectTimeout);
                    }
                    break;
                case "ioEvent":
                    this.eventListener.filter(x => x.eventName === data.params.eventName).forEach((listener, index) => {
                        try {
                            listener.listenerFn.apply(this, data.params.eventData);
                        } catch (error) {
                            console.error(`[SharedIO Frontend] Error calling listener for ${data.params.eventName}:`, error);
                        }
                    });
                    break;
            }
        }

        window.addEventListener('beforeunload', () => {
            this.sendWorkerCommand("disconnect");
        })
    }

    sendWorkerCommand(commandName, commandParams = {}) {
        this.worker.port.postMessage({
            name: commandName,
            params: commandParams
        });
    }

    connect(channelId, options = {}) {
        // 支持两种调用方式：
        // connect(channelId, onTimeout) - 旧方式
        // connect(channelId, { widgetId, screenId, preview, metric, x, onTimeout }) - 新方式
        let widgetId = null;
        let screenId = 1;
        let preview = '0';
        let metric = '';
        let x = '';
        let onTimeout = null;

        if (typeof options === 'function') {
            // 旧方式：第二个参数是 onTimeout 回调
            onTimeout = options;
        } else if (typeof options === 'object' && options !== null) {
            // 新方式：第二个参数是选项对象
            widgetId = options.widgetId || null;
            screenId = options.screenId || 1;
            preview = options.preview || '0';
            metric = options.metric || '';
            x = options.x || '';
            onTimeout = options.onTimeout || null;
        }

        this.connectTimeout = setTimeout(() => {
            console.warn("[SharedIO] connect timeout!");
            if (typeof onTimeout === "function") {
                onTimeout();
            }
        }, 10000);

        this.sendWorkerCommand("connect", { channelId, widgetId, screenId, preview, metric, x });
    }

    on(eventName, listenerFn) {
        this.eventListener.push({ eventName, listenerFn });
        this.sendWorkerCommand("attachEvent", { eventName });
    }

    emit(eventName, eventData) {
        this.sendWorkerCommand("emit", { eventName, eventData });
    }
}

// const myWorker = new SharedWorker('worker.js');

// myWorker.port.start();

// myWorker.port.onmessage = (e) => {
//     document.write(e.data);
//     document.close();
// }

// myWorker.port.postMessage([5, 5]);