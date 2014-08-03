describe('Angular Couchbase Lite', function () {

  var $httpBackend;
  var url = "my.couchbase.lite";
  var cbliteUrl = "http://username:password@" + url + "/";
  var restUrl = "http://username@" + url;
  var syncUrl = "http://my.sync.gateway";
  var dbname = "my-database";
  var cblite;

  window.cblite = {
    getURL: function (callback) {
      callback(null, cbliteUrl);
    }
  };

  function expectedHeaders(headers) {
    // Always expect the Authorization header to be set
    return headers["Authorization"] === "Basic dXNlcm5hbWU6cGFzc3dvcmQ=";
  }

  beforeEach(function () {
    this.addMatchers({
      toCauseTestFailure: function () { console.log('hit'); return false; },
      toContainAll: function (expected) {
        var property;
        for (property in expected) {
          if (expected.hasOwnProperty(property) &&
              this.actual[property] !== expected[property]) {
            return false;
          }
        }
        return true;
      }
    });
  });

  beforeEach(module('cblite'));

  beforeEach(inject(function($injector, _cblite_) {
    $httpBackend = $injector.get('$httpBackend');
    cblite = _cblite_;
    document.dispatchEvent(new window.Event('deviceready'));
  }));

  afterEach(function() {
    $httpBackend.verifyNoOutstandingExpectation();
    $httpBackend.verifyNoOutstandingRequest();
  });

  describe('server', function() {
    it('can be queried for meta-information', function() {
      var response = {
        "couchdb" : "Welcome",
        "CouchbaseLite" : "Welcome",
        "version" : "1.485"
      };

      $httpBackend.expectGET(restUrl, expectedHeaders)
        .respond(200, response);

      runs(function() {
        return cblite.info()
          .then(function(info) {
            expect(info).toContainAll(response);
          });
      });
    })
  });

  describe('databases', function() {

    it('can be queried for information', function() {
      var response = {
        "instance_start_time" : 1386620242527997,
        "committed_update_seq" : 25800,
        "disk_size" : 15360000,
        "purge_seq" : 0,
        "db_uuid" : "65FB16DF-FFD7-4514-9E8D-B734B066D28D",
        "doc_count" : 5048,
        "db_name" : dbname,
        "update_seq" : 25800,
        "disk_format_version" : 11
      };

      $httpBackend.expectGET(restUrl + "/" + dbname, expectedHeaders)
        .respond(200, response);

      runs(function() {
        return cblite.database(dbname).info()
          .then(function(result) {
            expect(result).toContainAll(response);
          });
      });
    });

    it("can't be queried for information if they don't exist", function() {
      var response = {
        "status" : 404,
        "error" : "not_found"
      };

      $httpBackend.expectGET(restUrl + "/" + dbname, expectedHeaders)
        .respond(404, response);

      runs(function() {
        return cblite.database(dbname).info()
          .catch(function(error) {
            expect(error.data).toContainAll(response);
          });
      });
    });

    it('that exist can be tested for existence', function() {
      var response = {
        "instance_start_time" : 1386620242527997,
        "committed_update_seq" : 25800,
        "disk_size" : 15360000,
        "purge_seq" : 0,
        "db_uuid" : "65FB16DF-FFD7-4514-9E8D-B734B066D28D",
        "doc_count" : 5048,
        "db_name" : dbname,
        "update_seq" : 25800,
        "disk_format_version" : 11
      };

      $httpBackend.expectGET(restUrl + "/" + dbname, expectedHeaders)
        .respond(200, response);

      runs(function() {
        return cblite.database(dbname).exists()
          .then(function(exists) {
            expect(exists).toBe(true);
          });
      });
    });

    it("that don't exist can be tested for existence", function() {
      var response = {
        "status" : 404,
        "error" : "not_found"
      };

      $httpBackend.expectGET(restUrl + "/" + dbname, expectedHeaders)
        .respond(404, response);

      runs(function() {
        return cblite.database(dbname).exists()
          .then(function(exists) {
            expect(exists).toBe(false);
          });
      });
    });

    it('can be created', function() {
      var response = {ok: true};
      $httpBackend.expectPUT(restUrl + "/" + dbname, null, expectedHeaders)
        .respond(200, response);

      runs(function() {
        return cblite.database(dbname).create()
          .then(function(result) {
            expect(result).toContainAll(response);
          });
      });

    });

    it("can't be created again", function() {
      var response = {
        "status" : 412,
        "error" : "file_exists"
      };
      $httpBackend.expectPUT(restUrl + "/" + dbname, null, expectedHeaders)
        .respond(412, response);

      runs(function() {
        return cblite.database(dbname).create().then(
          function (unexpectedSuccess) {
            console.log("success");
            expect(unexpectedSuccess).toCauseTestFailure();
          },
          function(error) {
            expect(error.data).toContainAll(response);
          });
      })
    })
  });

  describe('documents', function() {
    it('can not be saved with invalid content', function() {
      expect(cblite.database(dbname).document('document').save.bind(null))
        .toThrow("You can't save this type: undefined");
      expect(cblite.database(dbname).document('document').save.bind(null, null))
        .toThrow("You can't save a null document");
      expect(cblite.database(dbname).document('document').save.bind(null, 15))
        .toThrow("You can't save this type: number");
      expect(cblite.database(dbname).document('document').save.bind(null, true))
        .toThrow("You can't save this type: boolean");
      expect(cblite.database(dbname).document('document').save.bind(null, function() {}))
        .toThrow("You can't save this type: function");
    });

    it('can be saved with an id passed explicitly to save()', function() {
      var documentId = "document";
      var document = {
        foo: "bar"
      };
      var response = {
        "id" : documentId,
        "rev" : "1-4101356e9c47d15d4f8f7390d05dbbcf",
        "ok" : true
      };
      $httpBackend.expectPUT(restUrl + "/" + dbname + "/" + documentId, document, expectedHeaders)
        .respond(201, response);

      runs(function() {
        return cblite.database(dbname).document(documentId).save(document)
          .then(function(result) {
            expect(result).toContainAll(response);
          });
      });
    });

    it('can be saved with an id extracted from the document', function() {
      var documentId = "document";
      var document = {
        _id: documentId,
        foo: "bar"
      };
      var response = {
        "id" : documentId,
        "rev" : "1-4101356e9c47d15d4f8f7390d05dbbcf",
        "ok" : true
      };
      $httpBackend.expectPUT(restUrl + "/" + dbname + "/" + documentId, document, expectedHeaders)
        .respond(201, response);

      runs(function() {
        return cblite.database(dbname).document().save(document)
          .then(function(result) {
            expect(result).toContainAll(response);
          });
      });
    });

    it('can be saved without an id, allowing the server to generate one for us', function() {
      var documentId = "209BB170-C1E0-473E-B3C4-A4533ACA3CDD";
      var content1 = {
        foo: "bar"
      };
      var response1 = {
        "id" : documentId,
        "rev" : "1-4101356e9c47d15d4f8f7390d05dbbcf",
        "ok" : true
      };
      var content2 = {
        foo: "bar",
        bar: "baz"
      };
      var response2 = {
        "id" : documentId,
        "rev" : "1-5101356e9c47d15d4f8f7390d05dbbcf",
        "ok" : true
      };

      $httpBackend.expectPOST(restUrl + "/" + dbname, content1, expectedHeaders)
        .respond(201, response1);
      $httpBackend.expectPUT(restUrl + "/" + dbname + "/" + documentId, content2, expectedHeaders)
        .respond(201, response2);

      runs(function() {
        var document = cblite.database(dbname).document();
        return document.save(content1)
          .then(function(result) {
            expect(result).toContainAll(response1);

            // Save again and we should now be reusing the id from last time
            return document.save(content2)
              .then(function(result) {
                expect(result).toContainAll(response2);
              });
          });
      });

    });
  });

  describe('one-off replication', function() {
    it("can be initiated from local -> remote", function () {
      var request = {
        source: dbname,
        target: syncUrl + "/" + dbname,
        continuous: false
      };
      var response = {
        "session_id": "repl001",
        "ok": true
      };
      $httpBackend.expectPOST(restUrl + "/_replicate", request, expectedHeaders)
        .respond(200, response);

      runs(function () {
        return cblite.database(dbname).replicateTo(syncUrl).then(function (result) {
          expect(result).toContainAll(response);
        });
      })
    });

    it("local -> remote failures are reported", function () {
      var request = {
        source: dbname,
        target: syncUrl + "/" + dbname,
        continuous: false
      };
      var response = {
        "session_id": "repl001",
        "ok": false
      };
      $httpBackend.expectPOST(restUrl + "/_replicate", request, expectedHeaders)
        .respond(401, response);

      runs(function () {
        return cblite.database(dbname).replicateTo(syncUrl).then(
          function (unexpectedSuccess) {
            expect(unexpectedSuccess).toCauseTestFailure();
          },
          function (error) {
            expect(error.data).toContainAll(response);
          });
      })
    });

    it("can be initiated from remote -> local", function () {
      var request = {
        source: syncUrl + "/" + dbname,
        target: dbname,
        continuous: false
      };
      var response = {
        "session_id": "repl001",
        "ok": true
      };
      $httpBackend.expectPOST(restUrl + "/_replicate", request, expectedHeaders)
        .respond(200, response);

      runs(function () {
        return cblite.database(dbname).replicateFrom(syncUrl)
          .then(function (result) {
            expect(result).toContainAll(response);
          });
      });
    });

    it("remote -> local failures are reported", function () {
      var request = {
        source: syncUrl + "/" + dbname,
        target: dbname,
        continuous: false
      };
      var response = {
        "ok": false
      };
      $httpBackend.expectPOST(restUrl + "/_replicate", request, expectedHeaders)
        .respond(401, response);

      runs(function () {
        return cblite.database(dbname).replicateFrom(syncUrl).then(
          function (unexpectedSuccess) {
            expect(unexpectedSuccess).toCauseTestFailure();
          },
          function (error) {
            expect(error.data).toContainAll(response);
          });
      });
    });
  });

  describe('continuous replication', function() {
      it("can be initiated from local -> remote", function () {
        var request = {
          source: dbname,
          target: syncUrl + "/" + dbname,
          continuous: true
        };
        var response = {
          "session_id": "repl001",
          "ok": true
        };
        $httpBackend.expectPOST(restUrl + "/_replicate", request, expectedHeaders)
          .respond(200, response);

        runs(function () {
          return cblite.database(dbname).replicateTo({url: syncUrl, continuous: true}).then(function (result) {
            expect(result).toContainAll(response);
          });
        })
      });

      it("can be initiated from remote -> local", function () {
        var request = {
          source: syncUrl + "/" + dbname,
          target: dbname,
          continuous: true
        };
        var response = {
          "session_id": "repl001",
          "ok": true
        };
        $httpBackend.expectPOST(restUrl + "/_replicate", request, expectedHeaders)
          .respond(200, response);

        runs(function () {
          return cblite.database(dbname).replicateFrom({url: syncUrl, continuous: true}).then(function (result) {
            expect(result).toContainAll(response);
          });
        });
      });
    });

  describe('one-off sync', function () {
    it("can be initiated", function () {
      var localToRemoteRequest = {
        source: dbname,
        target: syncUrl + "/" + dbname,
        continuous: false
      };
      var localToRemoteResponse = {
        "session_id": "repl001",
        "ok": true
      };
      var remoteToLocalRequest = {
        source: syncUrl + "/" + dbname,
        target: dbname,
        continuous: false
      };
      var remoteToLocalResponse = {
        "session_id": "repl002",
        "ok": true
      };
      $httpBackend.expectPOST(restUrl + "/_replicate", localToRemoteRequest, expectedHeaders)
        .respond(200, localToRemoteResponse);
      $httpBackend.expectPOST(restUrl + "/_replicate", remoteToLocalRequest, expectedHeaders)
        .respond(200, remoteToLocalResponse);

      runs(function () {
        return cblite.database(dbname).syncWith(syncUrl)
          .then(function (result) {
            expect(result.localToRemote).toContainAll(localToRemoteResponse);
            expect(result.remoteToLocal).toContainAll(remoteToLocalResponse);
          });
      });
    });

    it("failures are reported", function () {
      var localToRemoteRequest = {
        source: dbname,
        target: syncUrl + "/" + dbname,
        continuous: false
      };
      var localToRemoteResponse = {
        "session_id": "repl001",
        "ok": true
      };
      var remoteToLocalRequest = {
        source: syncUrl + "/" + dbname,
        target: dbname,
        continuous: false
      };
      var remoteToLocalResponse = {
        "ok": false
      };
      $httpBackend.expectPOST(restUrl + "/_replicate", localToRemoteRequest, expectedHeaders)
        .respond(200, localToRemoteResponse);
      $httpBackend.expectPOST(restUrl + "/_replicate", remoteToLocalRequest, expectedHeaders)
        .respond(401, remoteToLocalResponse);

      runs(function () {
        return cblite.database(dbname).syncWith(syncUrl).then(
          function (unexpectedSuccess) {
            expect(unexpectedSuccess).toCauseTestFailure();
          },
          function (error) {
            expect(error.localToRemote).toContainAll(localToRemoteResponse);
            expect(error.remoteToLocal.data).toContainAll(remoteToLocalResponse);
          });
      });
    });
  });

  describe('continuous sync', function () {
      it("can be initiated", function () {
        var localToRemoteRequest = {
          source: dbname,
          target: syncUrl + "/" + dbname,
          continuous: true
        };
        var localToRemoteResponse = {
          "session_id": "repl001",
          "ok": true
        };
        var remoteToLocalRequest = {
          source: syncUrl + "/" + dbname,
          target: dbname,
          continuous: true
        };
        var remoteToLocalResponse = {
          "session_id": "repl002",
          "ok": true
        };
        $httpBackend.expectPOST(restUrl + "/_replicate", localToRemoteRequest, expectedHeaders)
          .respond(200, localToRemoteResponse);
        $httpBackend.expectPOST(restUrl + "/_replicate", remoteToLocalRequest, expectedHeaders)
          .respond(200, remoteToLocalResponse);

        runs(function () {
          return cblite.database(dbname).syncWith({url: syncUrl, continuous: true})
            .then(function (result) {
              expect(result.localToRemote).toContainAll(localToRemoteResponse);
              expect(result.remoteToLocal).toContainAll(remoteToLocalResponse);
            });
        });
      });
    });
});