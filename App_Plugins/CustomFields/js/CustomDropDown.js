angular.module('umbraco').controller("CustomDropDown", ['$scope', '$http', '$controller', function ($scope, $http, $controller) {
    var url = $scope.model.config.getItemsMethod;
    if (!url)
        return;

    angular.extend(this, $controller('Umbraco.PropertyEditors.DropdownFlexibleController', { $scope: $scope }));
    
    var items = $scope.model.config.items;
    if (items == null || items.length === 0) {
        $http.get(url).then(function (response) {
            if (response.data) {
                $scope.model.config.items = response.data.data;
            }
            else if (response.status != 200) {
                console.log("An error occurred during fetching data for lookup " + $scope.model.alias);
            }

        }, function (err) {
            console.log(err);
        }).catch(function () { });
    }
}]);