namespace metron {
    export var config: any = { };
    export var globals: any = {
        actions: {}
        , forms: {}
        , lists: {}
        , pivots: {}
        , handlers: {}
        , pager: {
            pages: []
            , root: "/"
        }
        , hashLoadedFromApplication: false
        , firstLoad: false
        , requiresDateTimePolyfill: false
    };
    export function onready(callback: Function, appName?: string) {
        document.addEventListener("DOMContentLoaded", function (e) {
            metron.templates.master.loadMaster(document.documentElement.outerHTML).then(() => {
                let proms = [];
                document.querySelectorAll("[data-m-include]").each((idx: number, elem: Element) => {
                    let prom = metron.templates.load(elem.attribute("data-m-include")).then(result => {
                        if (elem.attribute("data-m-type") != null && elem.attribute("data-m-type") == "markdown") {
                            (<HTMLElement>elem).innerHTML = metron.templates.markdown.toHTML(result);
                            (<HTMLElement>elem).show();
                        }
                        else {
                            (<HTMLElement>elem).innerHTML = result;
                        }
                    });
                    proms.push(prom);
                });
                Promise.all(proms).then(() => {
                    document.querySelectorAll("[data-m-type='markdown']").each((idx: number, elem: Element) => {
                        if (elem.attribute("data-m-include") == null) {
                            (<HTMLElement>elem).innerHTML = metron.templates.markdown.toHTML((<HTMLElement>elem).innerHTML);
                            (<HTMLElement>elem).show();
                        }
                    });

                    let root: string = metron.fw.getApplicationRoot(document.documentElement.outerHTML);
                    appName = (appName != null) ? appName : metron.fw.getApplicationName(document.documentElement.outerHTML);

                    let iDB = (appName == null) ? metron.DB : `${metron.DB}.${appName.lower()}`;
                    let iDBStore = (appName == null) ? metron.STORE : `${metron.STORE}.${appName.lower()}`;

                    let store = new metron.store(iDB, metron.DBVERSION, iDBStore);
                    store.init().then((result) => {
                        return store.getItem("metron.config", "value");
                    }).then((result) => {
                        if (result != null) {
                            metron.config = JSON.parse(<string><any>result);
                            metron.globals.firstLoad = true;
                            if (callback != null) {
                                callback(e);
                            }
                        }
                        else {
                            new Promise((resolve, reject) => {
                                metron.tools.loadJSON(`${root}/metron.json`, (configData: JSON) => {
                                    for (let obj in configData) {
                                        if (metron.config[obj] == null) {
                                            metron.config[obj] = configData[obj];
                                        }
                                    }
                                    metron.config["config.baseURL"] = `${document.location.protocol}//${document.location.host}`;
                                    store.init().then((result) => {
                                        return store.setItem("metron.config", JSON.stringify(metron.config));
                                    }).then((result) => {
                                        resolve(configData);
                                    }).catch((rs) => {
                                        console.log(`Error: Failed to access storage. ${rs}`);
                                    });
                                });
                            }).then(() => {
                                metron.globals.firstLoad = true;
                                if (callback != null) {
                                    callback(e);
                                }
                            }).catch((rsn) => {
                                console.log(`Error: Promise execution failed! ${rsn}`);
                            });
                        }
                    }).catch((reason) => {
                        console.log(`Error: Failed to access storage. ${reason}`);
                    });
                });
            }).catch(() => {
                console.log("Failed to check for master page.");
            });
        });
    }
    /*
    export function load(segment: string, model: string, func: Function, name?: string) {
        if (name == null) {
            if (document.querySelector(`[data-m-type="${segment}"][data-m-model="${model}"]`) != null) {
                func();
            }
        }
        else {
            if (document.querySelector(`[data-m-type="${segment}"][data-m-model="${model}"][data-m-page="${name}"]`) != null) {
                func();
            }
        }
    }
    */
    export function load(re: RegExp, func: Function | { n: string, func: Function }): void {
        let n, f;
        if(typeof func == "object") {
            n = func.n;
            f = func.func;
        }
        else {
            f = func;
        }
        let h = () => {
            if(n !== undefined) {
                let p = document.querySelector("[data-m-type='pivot']");
                if(p !== undefined) {
                    metron.controls.getPivot(p.attribute("data-m-page")).exact(n);
                }
            }
            f();
        };
        metron.routing.add(re, h);
    }
    export function ifQuerystring(callback: Function): void {
        let qs: string = <string><any>metron.web.querystring();
        if (qs != "") {
            let parameters = metron.tools.formatOptions(qs, metron.OptionTypes.QUERYSTRING);
            if (callback != null) {
                callback(parameters);
            }
        }
    }
    export namespace fw {
        export function getApplicationRoot(page: string): string {
            let root: string = (document.querySelector("body[data-m-root]") != null) ? `${document.querySelector("body[data-m-root]").attribute("data-m-root")}` : null;
            if (root == null) {
                root = metron.tools.getMatching(page, /\{\{m:root=\"(.*)\"\}\}/g);
            }
            metron.config["config.root"] = (root != null) ? root : "";
            return root;
        }
        export function getApplicationName(page: string): string {
            let appName: string = (document.querySelector("body[data-m-page]") != null) ? `${document.querySelector("body[data-m-page]").attribute("data-m-page")}` : null;
            if (appName == null) {
                appName = metron.tools.getMatching(page, /\{\{m:page=\"(.*)\"\}\}/g);
            }
            metron.config["config.appName"] = (appName != null) ? appName : "";
            return appName;
        }
        export function getBaseUrl(): string {
            if (metron.config["config.baseURL"] != null) {
                return ((<string>metron.config["config.baseURL"]).endsWith("/")) ? (<string>metron.config["config.baseURL"]).substr(0, (<string>metron.config["config.baseURL"]).length - 2) : `${metron.config["config.baseURL"]}`;
            }
            return "";
        }
        export function getAppUrl(): string {
            if (metron.config["config.baseURL"] != null) {
                let url = ((<string>metron.config["config.baseURL"]).endsWith("/")) ? (<string>metron.config["config.baseURL"]).substr(0, (<string>metron.config["config.baseURL"]).length - 2) : `${metron.config["config.baseURL"]}`;
                return (metron.config["config.root"] != null && metron.config["config.root"] != "") ? `${url}/${metron.config["config.root"]}` : url;
            }
            return "";
        }
        export function getBaseAPI(): string {
            if (metron.config["config.api.dir"] != null) {
                let url = ((<string>metron.config["config.api.dir"]).endsWith("/")) ? (<string>metron.config["config.api.dir"]).substr(0, (<string>metron.config["config.api.dir"]).length - 2) : `${metron.config["config.api.dir"]}`;
                return (metron.config["config.root"] != null && metron.config["config.root"] != "") ? `${metron.config["config.root"]}/${url}` : url;
            }
            return "";
        }
        export function getAPIExtension(): string {
            if (metron.config["config.api.extension"] != null) {
                return metron.config["config.api.extension"];
            }
            return "";
        }
        export function getAPIURL(model: string): string {
            return `${metron.fw.getBaseUrl()}/${metron.fw.getBaseAPI()}/${model}${metron.fw.getAPIExtension()}`;
        }
        export function loadOptionalFunctionality(): void {
            if (typeof Awesomplete !== undefined) {
                if (metron.globals.autolists == null) {
                    metron.globals.autolists = {};
                }
                document.querySelectorAll("[data-m-autocomplete]").each((idx: number, elem: Element) => {
                    let datalist: string[] = [];
                    let endpoint = elem.attribute("data-m-autocomplete");
                    let url: string = (endpoint.toLowerCase().startsWith("http")) ? endpoint : metron.fw.getAPIURL(endpoint);
                    metron.web.get(`${url}${metron.web.querystringify({ IsActive: true, _SortOrder: elem.attribute("data-m-search-text"), _SortDirection: "ASC" })}`, null, null, "json", (result) => {
                        if (result != null) {
                            for (var a in result) {
                                if (result.hasOwnProperty(a)) {
                                    if (result[a][elem.attribute("data-m-search-text")] != null) {
                                        datalist.push(result[a][elem.attribute("data-m-search-text")]);
                                        if (!metron.globals.autolists[(<HTMLInputElement>elem).attribute("id")]) {
                                            metron.globals.autolists[(<HTMLInputElement>elem).attribute("id")] = {};
                                        }
                                        if (!metron.globals.autolists[(<HTMLInputElement>elem).attribute("id")][result[a][elem.attribute("data-m-search-text")]]) {
                                            metron.globals.autolists[(<HTMLInputElement>elem).attribute("id")][result[a][elem.attribute("data-m-search-text")]] = {};
                                        }
                                        metron.globals.autolists[(<HTMLInputElement>elem).attribute("id")][result[a][elem.attribute("data-m-search-text")]] = result[a][elem.attribute("data-m-val")];
                                    }
                                }
                            }
                        }
                        let auto = new Awesomplete(elem, { minChars: 0, list: datalist, sort: false, maxItems: 20 });
                    })
                });
            }
        }
    }
    window.onhashchange = function () { //Is this still needed with the new paging/routing implementation?
        if (!metron.globals.hashLoadedFromApplication) {
            let hasPivoted = false;
            let section = document.querySelector("[data-m-type='pivot']");
            if (section != null) {
                let page = section.attribute("data-m-page");
                if (page != null) {
                    let p = metron.controls.getPivot(page);
                    p.previous();
                    hasPivoted = true;
                }
            }
            if (!hasPivoted) {
                window.location.reload(false);
            }
        }
        metron.globals.hashLoadedFromApplication = false;
    }
    metron.onready((e: Event) => {
        function recursePivot(elem: Element): void {
            if (elem != null) {
                elem.show();
                let route = elem.attribute("data-m-page");
                let pivot = elem.up("[data-m-type='pivot']");
                let pivotPageName = pivot.attribute("data-m-page");
                elem.up("[data-m-type='pivot']").querySelectorAll("[data-m-segment='pivot-item']").each((idx: number, el: Element) => {
                    if(el.up("[data-m-type='pivot']").attribute("data-m-page") === pivotPageName) {
                        if (el.attribute("data-m-page") != route) {
                            el.hide();
                        }
                    }
                });
                let parent = elem.parent().up("[data-m-segment='pivot-item']");
                if(parent != null) {
                    recursePivot(parent);
                }
            }
        }
        let wantsAutoload: boolean = ((document.querySelector("[data-m-autoload]") != null) && (document.querySelector("[data-m-autoload]").attribute("data-m-autoload") == "true"));
        document.querySelectorAll("[data-m-state='hide']").each((idx: number, elem: Element) => {
            elem.hide();
        });
        metron.controls.pivots.bindAll(() => {
            let route = metron.routing.getRouteName();
            if (route != null) {
                let page = document.querySelector(`[data-m-segment='pivot-item'][data-m-page="${route}"]`);
                recursePivot(page);
            }
            metron.fw.loadOptionalFunctionality();
            if (wantsAutoload) {
                metron.lists.bindAll(() => {
                    metron.forms.bindAll(() => {
                        metron.controls.polyfill();
                        //metron.page.loadSelects(document.querySelectorAll("select[data-m-binding]"));
                        //metron.page.loadActions(document.querySelectorAll("[data-m-action]"));
                    });
                });
            }
        });
    });
}
