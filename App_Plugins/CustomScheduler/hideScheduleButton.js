////below code to remove schedule button for categories and lookups
//var _lastEditorObserver = null; // Keep reference to the previously created observer so we can disconnect it
//function createObserverForEditor(editorArea, onFound) {
//    if (_lastEditorObserver) {
//        try { _lastEditorObserver.disconnect(); } catch (e) { /* ignore */ }
//        _lastEditorObserver = null;
//    }

//    const observer = new MutationObserver((mutations) => {
//        const dropdowns = editorArea.querySelectorAll(
//            ".umb-button-group__sub-buttons.dropdown-menu.ng-scope.ng-isolate-scope.-align-right"
//        );

//        if (!dropdowns || dropdowns.length === 0) return;

//        dropdowns.forEach(dropdown => {
//            if (dropdown.dataset.scheduleProcessed === "1") return;
//            try {
//                onFound(dropdown);
//                dropdown.dataset.scheduleProcessed = "1";
//            } catch (e) {
//                console.error("Error processing dropdown:", e);
//            }
//        });
//    });
//    observer.observe(editorArea, { childList: true, subtree: true });
//    _lastEditorObserver = observer;

//    return observer;
//}

//// ===== Hide "Schedule" button for specific document types =====
//angular.module("umbraco").run(["$rootScope", function ($rootScope) {

//    $rootScope.$on("content.loaded", function (event, args) {
//        if (!args || !args.content) return;
//        const docTypeId = args.content.id;
//        const blockedDocTypeIds = [1803, 1922, 1940];

//        if (!blockedDocTypeIds.includes(docTypeId)) {
//            if (_lastEditorObserver) {
//                try { _lastEditorObserver.disconnect(); } catch (e) { }
//                _lastEditorObserver = null;
//            }
//            return;
//        }
//        var editorArea = document.querySelector(".umb-editor");
//        if (!editorArea) {
//            editorArea = document.body;
//        }
//        createObserverForEditor(editorArea, function (dropdown) {
//            var scheduleButton = dropdown.querySelector('[data-element="button-schedulePublish"]');
//            if (scheduleButton) {
//                scheduleButton.style.display = "none";
//                scheduleButton.style.pointerEvents = "none";
//            }
//        });
//    });
//    window.addEventListener("beforeunload", function () {
//        if (_lastEditorObserver) {
//            try { _lastEditorObserver.disconnect(); } catch (e) { }
//            _lastEditorObserver = null;
//        }
//    });
//}]);