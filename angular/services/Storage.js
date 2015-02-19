"use strict";

(function(angular) {
    angular.module("cbAngularUtils").factory("$cbLocalStorage", [
        function() {
            return new Storage(window.localStorage);
        }
    ]);
    angular.module("cbAngularUtils").factory("$cbSessionStorage", [
        function() {
            return new Storage(window.sessionStorage);
        }
    ]);

    angular.module("cbAngularUtils").service("$cbStorage", [
        function() {
            /**
             * To create a new storage object.
             * 
             * @param {object} storage Storage object.
             * 
             * @return {Storage}
             *
             * @throws {StorageException} If storage is undefined.
             */
            this.createNewStorage = function(storage) {
                return new Storage(storage);
            };
        }
    ]);

    /**
     * Storage's constructor.
     * 
     * @param {object} _storageUsed Storage used for this object.
     *
     * @throws {StorageException} If storage is undefined.
     */
    function Storage(_storageUsed) {
        if (!_storageUsed) {
            throw new StorageException("The storage is undefined.");
        }

        this.getStorageUsed = function() {
            return _storageUsed;
        };
    }

    /**
     * Test if this namespace exist in the storage.
     * 
     * @param {string} namespace Namespace to be tested.
     * 
     * @return {boolean} If this namespace isn't saved in the storage, return false, else return true.
     */
    Storage.prototype.namespaceExist = function(namespace) {
        return this.getStorageUsed().getItem(namespace) === null ? false : true;
    };

    /**
     * Test if an item exists in the namespace.
     * 
     * @param {string} namespace Namespace where check if an item exists.
     * @param {string} key       Key to identify an item.
     * 
     * @return {boolean} If this item isn't saved in the namespace, return false, else return true.
     */
    Storage.prototype.itemExist = function(namespace, key) {
        var items = this.getItems(namespace);

        return items.hasOwnProperty(key);
    };

    /**
     * Clear the storage.
     */
    Storage.prototype.clearStorage = function() {
        this.getStorageUsed().clear();
    };

    /**
     * Clear the namespace.
     * 
     * @param {string} namespace Namespace to delete.
     */
    Storage.prototype.clearNamespace = function(namespace) {
        this.getStorageUsed().removeItem(namespace);
    };

    /**
     * Get all items saved in the namespace.
     * 
     * @param {string} namespace Namespace to get all items.
     * 
     * @return {object} Return an object with all items.
     */
    Storage.prototype.getItems = function(namespace) {
        var values = this.getStorageUsed().getItem(namespace);

        return values === null ? {} : JSON.parse(values);
    };

    /**
     * Get an item saved in a namespace.
     * 
     * @param {string} namespace    Namespace to get an item.
     * @param {string} key          Key to identify an item.
     * @param {mixed}  defaultValue If item isn't existed, return the defaultValue.
     * 
     * @return {mixed|undefined} Return the value or undefined.
     */
    Storage.prototype.getItem = function(namespace, key, defaultValue) {
        var items = this.getItems(namespace);
        var value;

        if (!items.hasOwnProperty(key) && defaultValue !== undefined) {
            value = defaultValue;
        } else if (items.hasOwnProperty(key)) {
            value = items[key];
        }

        return value;
    };

    /**
     * Count items in the namespace.
     * 
     * @param {string} namespace Namespace to count the items.
     * 
     * @return {integer} Return items number in the namespace. If namespaces isn't exist, return 0;
     */
    Storage.prototype.countItems = function(namespace) {
        if (this.namespaceExist(namespace)) {
            return Object.keys(this.getItems(namespace)).length;
        }

        return 0;
    };

    /**
     * Save an item in the namespace.
     * 
     * @param {string} namespace Namespace to save the item.
     * @param {string} key       Key to identify the item.
     * @param {mixed}  value     Item value.
     */
    Storage.prototype.setItem = function(namespace, key, value) {
        var items = this.getItems(namespace);
        items[key] = value;

        this.getStorageUsed().setItem(namespace, JSON.stringify(items));
    };

    /**
     * Delete an item in the namespace.
     * 
     * @param {string} namespace Namespace to delete the item.
     * @param {string} key       Key to identify the item.
     * 
     * @return {boolean} If success, return true, else return false.
     */
    Storage.prototype.removeItem = function(namespace, key) {
        var items = this.getItems(namespace);
        var deleteSuccessful = delete items[key];
        if (deleteSuccessful) {
            this.getStorageUsed().setItem(namespace, JSON.stringify(items));
        }

        return deleteSuccessful;
    };

    /**
     * Exception for storage object.
     * 
     * @param {string} message Error message.
     */
    function StorageException(message) {
        this.name = "StorageException";
        this.message = message;
    }
})(window.angular);