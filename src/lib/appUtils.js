function validArray(d) {
    return d instanceof Array && d.length >= 1;
}

function getIn(obj, arr) {
    let ret = null;
    try {
        if (validArray(arr)) {
            ret = obj;
            for (let i in arr) {
                ret = ret[arr[i]];
            }
        }
    } catch (e) {
        ret = null;
    }
    return ret;
}

function getIOSWKWebViewHandler() {
    return getIn(window, ["webkit", "messageHandlers"]);
}

function getAppMethod(methodName) {
    if (getIOSWKWebViewHandler()) {
        const IOSWKWebViewHandler = getIOSWKWebViewHandler();

        if (IOSWKWebViewHandler[methodName]) {
            return function () {
                let args = [].slice.call(arguments, 0);

                if (!validArray(args)) {
                    //ios WK js接口 只能且必须有一个参数
                    args.push("");
                }
                return IOSWKWebViewHandler[methodName].postMessage.apply(
                    IOSWKWebViewHandler[methodName],
                    args
                );
            };
        }
    }

    const handler = window.JsBridgeHelper;

    if (handler && handler[methodName]) {
        return function () {
            return handler[methodName].apply(handler, arguments);
        };
    }
}

export function appdownload(options) {
    const func = getAppMethod("appdownload");
    func && func(JSON.stringify(options));
}
