angular.module("umbraco.directives").controller('MainMenuNav.DialogController', function ($scope, $timeout, elementTypeResource, notificationsService, simpleTreeMenuServices) {

    var vm = this;
    vm.loadingNode = true;

    vm.save = function () {
        notificationsService.removeAll();
  
        var validatedata = retrieveData();
        var isValid = true;

        if (validatedata) {

            //if (!validatedata.area || validatedata.area.length == 0 || !validatedata.area[0]) {
            //    notificationsService.error("The Area field is required");
            //    isValid = false;
            //}

            if (!validateTargetURL(validatedata.targetUrl)) {
                notificationsService.error("Invalid Url Format for Target Url.");
                isValid = false;
            }

            if (!validateItemField(validatedata.item)) {
                notificationsService.error("Item field should be one item selected.");
                isValid = false;
            }

            if (validatedata.redirectToPage === '1') {

                if (!validatedata.item && IsEmptyString(validatedata.targetUrl)) {
                    notificationsService.error("Please choose Item or enter Target Url.");
                    isValid = false;
                }

                else if (validatedata.item && !IsEmptyString(validatedata.targetUrl)) {
                    notificationsService.error("Item and Target Url should not be entered together.");
                    isValid = false;
                }
            }
            
        }
        else
            isValid = false;

        if (!isValid)
            return;

        var data = saveData($scope.model.node);

        $scope.model.submit(data);
        $scope.model.data = data;
    };
    vm.close = function () {
        $scope.model.close();
    };

    vm.saving = false;

    $scope.$on("formSubmitting", function (ev, args) {
        if (!vm.saving) {
            $scope.model.data = saveData();
            vm.saving = false;
        }
    });
    function TrimStr(s) {
        return s === null || s === undefined ? null : s.trim();
    }
    function IsEmptyString(s) {
        return s === null || s === undefined || s.trim() === "";
    }
    function validateItemField(item) {

        var itemValidation = item.split(',');
        if (itemValidation.length > 1)
            return false;

        return true;
    }
    function validateTargetURL(url) {
        url = TrimStr(url);
        if (!url)
            return true;

        var urlValidation = url.split('#');
        if (IsEmptyString(urlValidation[0]))
            return true;

        return urlValidation[0].match(new RegExp("^https?:\\/\\/(?:www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b(?:[-a-zA-Z0-9()@:%_\\+.~#?&\\/=]*)$"));
    }
    function retrieveData() {
        if ($scope.model.node) {
            return simpleTreeMenuServices.flatten($scope.model.node);
        } else {
            return null;
        }
    }
    function saveData() {
        vm.saving = true;
        if ($scope.model.node) {
            $scope.$broadcast('formSubmitting', { scope: $scope });
            return simpleTreeMenuServices.flatten($scope.model.node);
        } else {
            return null;
        }
    }
    function loadData() {
        simpleTreeMenuServices.scaffold($scope.model.selectedDoctype, $scope.model.data).then(function (result) {
            vm.edit = true;
            $scope.model.node = result.scaffold;
            $scope.model.data = result.menuNode;

            vm.loadingNode = false;
        }, function (error) {
                notificationsService.error("Error loading document type: \"" + $scope.model.selectedDoctype + "\"", error.errorMsg);
        });
    }
    $timeout(function () {
        if (!$scope.model.data)
            $scope.model.data = {};

        if ($scope.model.doctype) {
            $scope.model.selectedDoctype = $scope.model.doctype;
            elementTypeResource.getAll().then(function (elementTypes) {

                var doctype;
                for (var i = 0; i < elementTypes.length; i++) {
                    if (elementTypes[i].alias === $scope.model.selectedDoctype) {
                        doctype = elementTypes[i];
                        break;
                    }
                }
                if (doctype == undefined) {
                    notificationsService.error("Error loading document type: \"" + $scope.model.selectedDoctype + "\"", "");
                    $scope.model.close();
                } else {
                    loadData();
                }
            });
            
        }
    });
});