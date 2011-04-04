/**
 * @workInProgress
 * @ngdoc service
 * @name angular.service.$cacheFactory
 *
 * @description
 * Factory that constructs cache objects.
 *
 *
 * @param {string} cacheId Name or id of the newly created cache.
 * @param {object=} options Options object that specifies the cache behavior. Properties:
 *
 *   - `{number=}` `capacity` — turns the cache into LRU cache.
 *
 * @returns {object} Newly created cache object with the following set of methods:
 *
 * - `{string}` `id()` — Returns id or name of the cache.
 * - `{number}` `size()` — Returns number of items currently in the cache
 * - `{void}` `put({string} key, {*} value)` — Puts a new key-value pair into the cache
 * - `{(*}} `get({string} key) — Returns cached value for `key` or undefined for cache miss.
 * - `{void}` `remove{string} key) — Removes a key-value pair from the cache.
 * - `{void}` `removeAll() — Removes all cached values.
 *
 */
angularServiceInject('$cacheFactory', function() {

  var caches = {},
      cacheStats = {};

  function cacheFactory(cacheId, options) {
    if (cacheId in caches) {
      throw Error('cacheId ' + cacheId + ' taken');
    }

    var stats = cacheStats[cacheId] = extend({}, options, {size:0}),
        data = {},
        capacity = (options && options.capacity) || Number.MAX_VALUE,
        lruHash = {},
        freshEnd = null,
        staleEnd = null;

    return caches[cacheId] = {
      id: valueFn(cacheId),


      size: function() { return stats.size; },


      put: function(key, value) {
        var lruEntry = lruHash[key] || (lruHash[key] = {key: key});

        refresh(lruEntry);

        if (isUndefined(value)) return;
        if (!(key in data)) stats.size++;
        data[key] = value;

        if (stats.size > capacity) {
          this.remove(staleEnd.key);
        }
      },


      get: function(key) {
        var lruEntry = lruHash[key];

        if (!lruEntry) return;

        refresh(lruEntry);

        return data[key];
      },


      remove: function(key) {
        var lruEntry = lruHash[key];

        if (lruEntry == freshEnd) freshEnd = lruEntry.prev;
        if (lruEntry == staleEnd) staleEnd = lruEntry.next;
        link(lruEntry.next,lruEntry.prev);

        delete lruHash[key];
        delete data[key];
        stats.size--;
      },


      removeAll: function() {
        data = {};
        stats.size = 0;
        lruHash = {};
        freshEnd = staleEnd = null;
      },


      destroy: function() {
        data = null;
        stats = null;
        lruHash = null;
        delete caches[cacheId];
        delete cacheStats[cacheId];
      }
    }


    /**
     * makes the `entry` the freshEnd of the LRU linked list
     */
    function refresh(entry) {
      if (entry != freshEnd) {
        if (!staleEnd) {
          staleEnd = entry;
        } else if (staleEnd == entry) {
          staleEnd = entry.next;
        }

        link(entry.next, entry.prev);
        link(entry, freshEnd);
        freshEnd = entry;
        freshEnd.next = null;
      }
    }


    /**
     * bydirectionally links two entries of the LRU linked list
     */
    function link(nextEntry, prevEntry) {
      if (nextEntry != prevEntry) {
        if (nextEntry) nextEntry.prev = prevEntry;
        if (prevEntry) prevEntry.next = nextEntry;
      }
    }
  }


  cacheFactory.info = function() {
    return copy(cacheStats);
  }


  cacheFactory.get = function(cacheId) {
    return caches[cacheId];
  }


  return cacheFactory;
});
