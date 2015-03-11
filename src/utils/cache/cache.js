(function(angular) {
    "use strict";

    var moduleCache = angular.module("cbAngular.utils.cache", [
        "cbAngular.utils.storage"
    ]);
    moduleCache.provider("cbSessionCache", [
        function() {
            var namespaceStorage = "Cache";

            this.setNamespaceStorage = function(name) {
                namespaceStorage = name;
            };

            this.$get = [
                "cbSessionStorage",
                function (cbSessionStorage) {
                    return new Cache(cbSessionStorage, name);
                }
            ];
        }
    ]);

    moduleCache.provider("cbPersistentCache", [
        function() {
            var namespaceStorage = "Cache";

            this.setNamespaceStorage = function(name) {
                namespaceStorage = name;
            };

            this.$get = [
                "cbLocalStorage",
                function (cbLocalStorage) {
                    return new Cache(cbLocalStorage, namespaceStorage);
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
        var StorageConstructor = moduleCache.constant("cbStorageConstructor");
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
     * Check if this key is present in cache.
     * 
     * @param {string} key Key to search in the cache.
     * 
     * @return {Boolean} True if it's present, else false.
     */
    Cache.prototype.isCached = function(key) {
        return this.getStorage().itemExist(this.getNamespaceStorage(), key);
    };

    /**
     * Check if this key references a expired value.
     * 
     * @param {string} key Key to search in the cache.
     * 
     * @return {Boolean} True if it isn't present or value is expired, else false.
     */
    Cache.prototype.isExpired = function(key) {
        if (!this.isCached(key)) {
            return true;
        }

        var itemCached = this.getStorage().getItem(this.getNamespaceStorage(), key);
        var container = new CacheContainer(itemCached.value, new Date(itemCached.dateExpire));

        return container.isExpired();
    };

    /**
     * Get the value cached referenced by the key.
     * 
     * @param {string} key Key to search the value.
     * 
     * @return {mixed}
     */
    Cache.prototype.get = function(key) {
        if (!this.isCached(key)) {
            throw new CacheException("Key is not cached.");
        }

        var item = this.getStorage().getItem(this.getNamespaceStorage(), key);
        var container = new CacheContainer(item.value, new Date(item.dateExpire));

        if (container.isExpired()) {
            throw new CacheException("Value referenced by '"+key+"' key is expired."); 
        }

        return container.value;
    };

    /**
     * Remove the value referenced by the key.
     * 
     * @param {string} key Key to delete the value.
     * 
     * @return {Boolean} True if the deletion is successful, else false.
     */
    Cache.prototype.remove = function(key) {
        return this.getStorageService().removeItem(this.getNamespaceStorage(), key);
    };

    /**
     * Remove all cached values.
     */
    Cache.prototype.removeAll = function() {
        this.getStorageService().clearNamespace(this.getNamespaceStorage());
    };

    /**
     * Remove the expired values.
     * 
     * @return {integer} Return count of deleted values.
     *
     * @throws {CacheException} If the deletion is failed for one value.
     */
    Cache.prototype.clean = function() {
        var items = this.getStorageService().getItems(this.getNamespaceStorage());
        var countValuesDeleted = 0;
        for (var key in items) {
            var container = new CacheContainer(items[key].value, new Date(items[key].dateExpire));
            if (container.isExpired()) {
                if (!this.remove(key)) {
                    throw new CacheException("Fail to clean the cache. Fail to '"+key+"' key.");
                }
                countValuesDeleted++;
            }
        }

        return countValuesDeleted;
    };

    /**
     * Count the total cached values.
     * 
     * @return {integer}
     */
    Cache.prototype.countValuesCached = function() {
        return this.getStorageService().countItems(this.getNamespaceStorage());
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
        return this.dateExpire < new Date();
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

    moduleCache.constant("cbCacheConstructor", Cache);
    moduleCache.constant("cbCacheExceptionConstructor", CacheException);
    moduleCache.constant("cbCacheContainerConstructor", CacheContainer);
})(window.angular);