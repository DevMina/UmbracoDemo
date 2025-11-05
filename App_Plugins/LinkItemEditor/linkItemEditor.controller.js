angular.module("umbraco").controller("LinkItemEditorController", function ($scope, $http) {
    // Optional: initialize values
    $scope.model.value = $scope.model.value || {
        Title: "",
        linkType: $scope.model.validation.mandatory ? "External": "",
        InternalPage: null,
        ExternalUrl: "",
        InternalPageUrl: null
    };

    // Load link types from JSON file
    $scope.linkTypes = [];
    $http.get('/App_Plugins/LinkItemEditor/linkTypes.json')
        .then(function(response) {
            $scope.linkTypes = response.data.linkTypes;
        })
        .catch(function(error) {
            console.error('Error loading link types:', error);
            // Fallback to default options if JSON load fails
            $scope.linkTypes = [
                { value: "External", label: "External Link" },
                { value: "DetailsPage", label: "Details Page" },
                { value: "InternalContent", label: "Internal Content" }
            ];
        });
    $scope.internalPagePicker = {
        view: "contentpicker",
        alias: "InternalPage",
        config: {
           // startNodeId: 1094
        },
        value: $scope.model.value.InternalPage
    };

    $scope.$watch("internalPagePicker.value", function (newVal) {
        $scope.model.value.InternalPage = newVal;
        if (newVal) {
            var lang = $scope.model.culture;

            // Call the .NET API to get the URL for the selected internal page
            $http.get('/api/content/Publishedkey/' + newVal, {
                headers: {
                    'Accept-Language': lang
                }
            })
            .then(function (response) {
                // Save the URL in your model, or do whatever you need with it
                $scope.model.value.InternalPageUrl = response.data.data; // .data if your API wraps the result
                //if (!response.data.data) {
                //    $scope.internalPagePicker.value = null;
                //}
            })
            .catch(function (error) {
                $scope.model.value.InternalPageUrl = null;
                console.error('Failed to fetch internal page URL:', error);
            });
        } else {
            $scope.model.value.InternalPageUrl = null;
        }
    });

    // Clear unrelated values on linkType change
    $scope.$watch("model.value.linkType", function (newVal, oldVal) {
        if (newVal === oldVal) return; // Skip initial call
        
        // Reset all fields first
        $scope.model.value.ExternalUrl = "";
        $scope.model.value.InternalPage = null;
        $scope.internalPagePicker.value = null;
        $scope.model.value.InternalPageUrl = null;
    });

   
});
