"use strict";

(function(angular) {
    angular.module("cbAngularUtils").provider("$cbSessionCache", [
        function() {
            var namespaceStorage = "Cache";

            this.setNamespaceStorage = function(name) {
                namespaceStorage = name;
            };

            this.$get = [
                "$cbSessionStorage",
                function ($cbSessionStorage) {
                    return new Cache($cbSessionStorage, name);
                }
            ];
        }
    ]);

    angular.module("cbAngularUtils").provider("$cbPersistentCache", [
        function() {
            var namespaceStorage = "Cache";

            this.setNamespaceStorage = function(name) {
                namespaceStorage = name;
            };

            this.$get = [
                "$cbLocalStorage",
                function ($cbLocalStorage) {
                    return new Cache($cbLocalStorage, namespaceStorage);
                }
            ];
        }
    ]);

    /**
     * Cache's constructor.
     * 
     * @param {object} _storageService   Service angularJS to manage the saved cache.
     * @param {string} _namespaceStorage Namespace to storage the cache.
     *
     * @throws {CacheException} If storage is undefined or not instance of Storage.
     * @throws {CacheException} If namespace storage is undefined or empty.
     */
    function Cache(_storageService, _namespaceStorage) {
        var StorageConstructor = angular.module("cbAngularUtils").constant("cbStorageConstructor");
        if (!_storageService || !(_storageService instanceof StorageConstructor)) {
            throw new CacheException("The storage service is undefined or not instance of Storage.");
        }

        if (!_namespaceStorage || _namespaceStorage === "") {
            throw new CacheException("The cache need a storage namespace.");
        }

        this.getStorageService = function() {
            return _storageService;
        };

        this.getNamespaceStorage = function() {
            return _namespaceStorage;
        };
    }

    /**
     * Try to generate an object for the storage. Use getter methods and public attributes.
     * 
     * @param {object} obj [description]
     * 
     * @return {object}
     *
     * @throws {CacheException} If First argument isn't an object.
     */
    Cache.prototype.generateObjectForStorageWithGetter = function(obj) {
        if (!(obj instanceof Object)) {
            throw new CacheException("First argument of generateObjectForStorageWithGetter method must be an object.");
        }

        var objReturn = {};
        for (var nameFnt in obj) {
            if (obj[nameFnt] instanceof Function) {
                var nameVar = nameFnt.match(/^get(.*)/);
                if (nameVar.length < 2) {
                    continue;
                }

                nameVar = nameVar[1].charAt(0).toLowerCase() + nameVar.slice(1);

                // if the getter has got arguments, ignore it.
                if (!obj[nameFnt].toString().match(/^function[^\(]*\(\)/)) {
                    continue;
                }

                objReturn[nameVar] = obj[nameFnt]();
            } else {
                objReturn[nameFnt] = obj[nameFnt];
            }
        }

        return objReturn;
    };

    /**
     * Save an element in the cache.
     * 
     * @param {string}  key   Cache Key.
     * @param {mixed}   value Cached value.
     * @param {integer} ttl   Time to live in seconds.
     */
    Cache.prototype.put = function(key, value, ttl) {
        var dateExpire = new Date();
        dateExpire.setSeconds(dateExpire.getSeconds() + ttl);
        this.getStorageService().setItem(this.getNamespaceStorage(), key, new CacheContainer(value, dateExpire));
    };

    /**
     * CacheContainer's constructor.
     * 
     * @param {mixed} value      Value to cached.
     * @param {Date}  dateExpire Date to invalidate the cache.
     *
     * @throws {CacheContainerException} If dateExpire isn't Date object.
     */
    function CacheContainer(value, dateExpire) {
        if (!(dateExpire instanceof Date)) {
            throw new CacheContainerException("Second argument to create a new CacheContainer must be a Date object. "+dateExpire.constructor.name+" object given.");
        }
        this.value = value;
        this.dateExpire = dateExpire;
    }

    /**
     * Check this cache is expired or not for now.
     * 
     * @return {Boolean} True: expired, else false.
     */
    CacheContainer.prototype.isExpired = function() {
        return new Date(this.dateExpire) < new Date();
    };

    /**
     * Exception for cache object.
     * 
     * @param {string} message Error message.
     */
    function CacheException(message) {
        this.name = "CacheException";
        this.message = message;
    }

    /**
     * Exception for cacheContainer object.
     * 
     * @param {string} message Error message.
     */
    function CacheContainerException(message) {
        this.name = "CacheContainerException";
        this.message = message;
    }
})(window.angular);