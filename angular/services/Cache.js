"use strict";

(function(angular) {
    angular.module("cbAngularUtils").factory("$cbSessionCache", [
        "$cbSessionStorage",
        function ($cbSessionStorage) {
            return new Cache($cbSessionStorage);
        }
    ]);

    angular.module("cbAngularUtils").factory("$cbPersistentCache", [
        "$cbLocalStorage",
        function ($cbLocalStorage) {
            return new Cache($cbLocalStorage);
        }
    ]);

    /**
     * Cache's constructor.
     * 
     * @param {object} _storageService Service angularJS to manage the saved cache.
     *
     * @throws {CacheException} If storage is undefined or not instance of Storage.
     */
    function Cache(_storageService) {
        var StorageConstructor = angular.module("cbAngularUtils").constant("cbStorageConstructor");
        if (!_storageService || !(_storageService instanceof StorageConstructor)) {
            throw new CacheException("The storage service is undefined or not instance of Storage");
        }

        this.getStorageService = function() {
            return _storageService;
        };
    }

    /**
     * Exception for storage object.
     * 
     * @param {string} message Error message.
     */
    function CacheException(message) {
        this.name = "CacheException";
        this.message = message;
    }
})(window.angular);