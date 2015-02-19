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