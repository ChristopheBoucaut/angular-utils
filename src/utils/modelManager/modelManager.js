(function(angular) {
    "use strict";

    var modelModule = angular.module("cbAngular.utils.modelManager", [
        "cbAngular.utils.cache"
    ]);

    modelModule.provider("cbModelManager", [
        function() {
            var baseUrlApi;

            /**
             * Set the base url to request the API.
             * 
             * @param {string} newBaseUrlApi
             */
            this.setBaseUrlApi = function(newBaseUrlApi) {
                baseUrlApi = newBaseUrlApi;
            };

            this.$get = [
                "$http",
                "cbCacheConstructor",
                function($http, cbCacheConstructor) {
                    return new ModelManager(baseUrlApi, $http, cbCacheConstructor);
                }
            ];
        }
    ]);

    /**
     * Class to the service.
     */
    function ModelManager(_baseUrlApi, _httpService, _cacheConstructor) {
        var _models = {};
        var _cacheService;

        this.setBaseUrlApi = function(baseUrlApi) {
            _baseUrlApi = baseUrlApi;
        };
        this.getBaseUrlApi = function() {
            return _baseUrlApi;
        };
        this.setHttpService = function(httpService) {
            _httpService = httpService;
        };
        this.getHttpService = function() {
            return _httpService;
        };
        this.setCacheService = function(cacheService) {
            _cacheService = cacheService;
        };
        this.getCacheService = function() {
            return _cacheService;
        };
        this.getModels = function() {
            return _models;
        };

        /**
         * Register a new model.
         * 
         * @param {Model} model New model to register.
         */
        this.registerModel = function(model) {
            if (!(model.prototype instanceof Model)) {
                var nameObj = model.name === undefined ? model.constructor.name : model.name;
                throw new ModelManagerException("The first agrument of registerModel must be a Model object. Receive "+nameObj+" object");
            }
            if (model.prototype.typeApi === undefined) {
                throw new ModelManagerException("The model "+model.name+" need to override the variable class named 'typeApi'.");
            }

            _models[model.name] = model;
        };

        /**
         * To get the model constructor by its name.
         * 
         * @param {string} name The model's name.
         * 
         * @return {Function} Return the constructor.
         *
         * @throws {ModelManagerException} If model isn't found.
         */
        this.getModelByName = function(name) {
            if (!_models.hasOwnProperty(name)) {
                throw new ModelManagerException("The model : '"+name+"' is not registered.");
            }

            return _models[name];
        };

        /**
         * Create an object for a new model's prototype.
         * 
         * @param {string} type Model's type to build the url api.
         * 
         * @return {Object}
         *
         * @throws {ModelManagerException} If cache object isn't defined or it isn't instance of GeneanetCache.
         */
        this.createPrototype = function(type) {
            if (!(_cacheService instanceof _cacheConstructor)) {
                if (_cacheService !== undefined) {
                    throw new ModelManagerException("Need a "+_cacheConstructor.name+" object to use cache. Set with setCache(yourcache).");
                } else {
                    throw new ModelManagerException("Set a cache to use : GeneanetModelManager.setCache(yourCache).");
                }
            }

            return Object.create(Model.prototype, {
                type: {
                    value: type
                },
                baseUrlApi: {
                    value: _baseUrlApi
                },
                cacheService: {
                    value: _cacheService
                },
                httpService: {
                    value: _httpService
                }
            });
        };
    }

    /**
     * Return ModelManager's exception construtor.
     * 
     * @return {Function}
     */
    ModelManager.prototype.getException = function() {
        return ModelManagerException;
    };

    /**
     * Return the configuration http constructor.
     * 
     * @return {Function}
     */
    ModelManager.prototype.getModelConfigurationHttp = function() {
        return ModelConfigurationHttp;
    };

    /**
     * Class parent to future models.
     */
    function Model() {}

    // First element in the api url.
    Model.prototype.typeApi = undefined;
    // base url api.
    Model.prototype.baseUrlApi = undefined;
    // Cache object used.
    Model.prototype.cacheService = undefined;
    // Http object to request the API.
    Model.prototype.httpService = undefined;

    /**
     * Send a request at API.
     * 
     * @param {ModelConfigurationHttp} configuration Configuration to request api.
     * 
     * @return {Promise} Return a promise object to add action on event finished.
     *
     * @throws {ModelException} If configuration isn't instance of ModelConfigurationHttp.
     * @throws {ModelException} If configuration.methodHttp doesn't exist in httpService object.
     */
    Model.prototype.http = function(configurationHttp) {
        // check configuration's type.
        if (!(configurationHttp instanceof ModelConfigurationHttp)) {
            throw new ModelException("First parameter of http() method must be a ModelConfigurationHttp object but receive a '"+configurationHttp.constructor.name+"' object.");
        }

        // check method to request the API exists.
        var methodHttp = configurationHttp.getMethodHttp().toLowerCase();
        if (!this.httpService.hasOwnProperty(methodHttp)) {
            throw new ModelException((this.httpService.name ? this.httpService.name : this.httpService.constructor.name)+" object doesn't know the method : "+methodHttp);
        }

        var fullUrlApi = this.baseUrlApi+"/"+this.typeApi+"/"+configurationHttp.getActionUrl();

        var promiseRequestHttp;
        if (methodHttp === "get") {
            fullUrlApi = fullUrlApi+"?"+configurationHttp.buildDatas("&");
            promiseRequestHttp = this.requestHttp[methodHttp](fullUrlApi);
        } else {
            promiseRequestHttp = this.requestHttp[methodHttp](fullUrlApi, configurationHttp.getDatas());
        }

        return promiseRequestHttp;
    };

    /**
     * To request the api.
     * 
     * @param {ModelConfigurationHttp} configuration   Configuration to build the correct request at API.
     * @param {Function|undefined}     successCallback Method called if the request is successful.
     * @param {Function|undefined}     failCallback    Method called if the request is failed.
     * @param {Boolean}                refresh         Flag to force request the api (true) or allow request the cache (false).
     * 
     * @throws {ModelException} If configuration object isn't instance of ModelConfigurationHttp.
     */
    Model.prototype.requestApi = function(configuration, successCallback, failCallback, refresh) {
        successCallback = successCallback instanceof Function ? successCallback : undefined;
        failCallback = failCallback instanceof Function ? failCallback : undefined;
        refresh = refresh ? refresh : false;

        // check configuration's type.
        if (!(configuration instanceof ModelConfigurationHttp)) {
            throw new ModelException("The first parameter of requestApi method must be a ModelConfigurationHttp object but receive a '"+configuration.controller.name+"' object.");
        }

        // Not use cache.
        if (configuration.getTtlCache() === undefined) {
            this.http(configuration).then(
                function(data) {
                    if (successCallback) {
                        successCallback(data.data, data.status);
                    }
                },
                function(data) {
                    if (failCallback) {
                        failCallback(data.data, data.status);
                    }
                }
            );
        } else {
            var keyCache = configuration.buildKeyCache();
            // not force refresh and cache is valid.
            if (!refresh && !this.cacheService.isExpired(keyCache)) {
                if (successCallback) {
                    var datasFromCache = this.cacheService.get(keyCache);
                    successCallback(datasFromCache.data, datasFromCache.status);
                }
            } else {
                // force refresh or cache expired.
                var selfModel = this;
                this.http(configuration).then(
                    function(data) {
                        // cache new value.
                        selfModel.cacheService.put(keyCache, data, configuration.getTtlCache());
                        if (successCallback) {
                            successCallback(data.data, data.status);
                        }
                    },
                    function(data) {
                        if (failCallback) {
                            failCallback(data.data, data.status);
                        }
                    }
                );
            }
        }
    };

    /**
     * Return Model's exception construtor.
     * 
     * @return {Function}
     */
    Model.prototype.getException = function() {
        return ModelException;
    };

    /**
     * Configuration class to execute Model's http method.
     * 
     * @param {string}            _methodHttp Http method to request API (eg: 'post', 'put', etc).
     * @param {string}            _actionUrl  Action name api. Used to build the url api.
     * @param {Object}            _datas      Parameters to request the API.
     * @param {integer|undefined} _ttlCache   Time To Live for the cache. If it isn't defined, don't use the cache.
     */
    function ModelConfigurationHttp(_methodHttp, _actionUrl, _datas, _ttlCache) {
        this.getMethodHttp = function() {
            return _methodHttp;
        };
        this.setMethodHttp = function(methodHttp) {
            _methodHttp = methodHttp;
        };
        this.getActionUrl = function() {
            return _actionUrl;
        };
        this.setActionUrl = function(actionUrl) {
            _actionUrl = actionUrl;
        };
        this.getDatas = function() {
            return _datas;
        };
        this.setDatas = function(datas) {
            _datas = datas;
        };
        this.getTtlCache = function() {
            return _ttlCache;
        };
        this.setTtlCache = function(ttlCache) {
            _ttlCache = ttlCache;
        };
    }

    /**
     * Join configuration's datas with a glue string. Used for build url API in get mode.
     * 
     * @param {string} glue String used to build the parameters string.
     * 
     * @return {string} Parameters string.
     */
    ModelConfigurationHttp.prototype.buildDatas = function(glue) {
        var params = [];
        for (var nameParam in this.getDatas()) {
            var valueParam = this.getDatas()[nameParam];
            if (valueParam === undefined || valueParam === null) {
                continue;
            }
            if (valueParam instanceof Array) {
                for (var i = 0; i < valueParam.length; i++) {
                    params.push(nameParam+"[]="+valueParam[i]);
                }
            } else if (valueParam instanceof Object) {
                for (var nameKey in valueParam) {
                    params.push(nameParam+"["+nameKey+"]="+valueParam[nameKey]);
                }
            } else {
                params.push(nameParam+"="+valueParam);
            }
        }

        return params.join(glue);
    };

    /**
     * Build a key for the cache.
     * 
     * @return {string} Cache key.
     */
    ModelConfigurationHttp.prototype.buildKeyCache = function() {
        return this.getMethodHttp()+"_"+this.getActionUrl()+"_"+this.buildDatas("_");
    };

    /**
     * Return ModelConfigurationHttp's exception construtor.
     * 
     * @return {Function}
     */
    ModelConfigurationHttp.prototype.getException = function() {
        return ModelConfigurationHttpException;
    };

    /**
     * ModelManager's exception.
     * 
     * @param {string} message Error message.
     */
    function ModelManagerException(message) {
        this.message = message;
        this.name = "ModelManagerException";
    }

    /**
     * Model's exception.
     * 
     * @param {string} message Error message.
     */
    function ModelException(message) {
        this.message = message;
        this.name = "ModelException";
    }

    /**
     * ModelConfigurationHttp's exception.
     * 
     * @param {string} message Error message.
     */
    function ModelConfigurationHttpException(message) {
        this.message = message;
        this.name = "ModelConfigurationHttpException";
    }
})(window.angular);