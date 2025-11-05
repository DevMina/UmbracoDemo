(function () {
    "use strict";

    function CustomSchedulerOverlayController($scope, $timeout, $http, notificationsService, contentResource, fileManager) {
        var vm = this;
        var overlay = $scope.model;
        $scope.model.hideHeader = false;
        $scope.model.title = "Scheduled Publishing";
        vm.title = ($scope.model && $scope.model.title) ? $scope.model.title : "Schedule";
        $scope.submitting = false;
        $scope.isDatesValid = function () {
            const now = new Date(); // current date and time

            const d1 = vm.publishAt ? new Date(vm.publishAt) : null;
            const d2 = vm.unpublishAt ? new Date(vm.unpublishAt) : null;

            // Reset message before validation
            $scope.dateValidationMessage = '';

            // Helper: check if date is valid
            const isValidDate = (d) => d instanceof Date && !isNaN(d.getTime());

            // Case 0: No dates provided
            if (!d1 && !d2) {
                $scope.dateValidationMessage = "Please select at least one date (publish or unpublish).";
                return false;
            }

            // Case 1: Both dates provided
            if (d1 && d2) {
                if (!isValidDate(d1) || !isValidDate(d2)) {
                    $scope.dateValidationMessage = "One or both dates are invalid.";
                    return false;
                }
                if (d1 < now || d2 < now) {
                    $scope.dateValidationMessage = "Dates cannot be in the past.";
                    return false;
                }
                if (d1 >= d2) {
                    $scope.dateValidationMessage = "Unpublish date must be after publish date.";
                    return false;
                }

                // All good
                $scope.dateValidationMessage = "";
                return true;
            }

            // Case 2: Only one date provided
            const singleDate = d1 || d2;
            if (!isValidDate(singleDate)) {
                $scope.dateValidationMessage = "Invalid date format.";
                return false;
            }
            if (singleDate < now) {
                $scope.dateValidationMessage = "Date cannot be in the past.";
                return false;
            }

            // All good
            $scope.dateValidationMessage = "";
            return true;
        };

        overlay.submit = function () {
            $scope.submitting = true;
            $scope.model.disableSubmitButton = true;
            if (!$scope.isDatesValid()) {
                $scope.model.disableSubmitButton = false;
                return;
            }
            var req = $scope.model.parentScope.content;

            // Backup the entire variants object before modification
            var variantsBackup = angular.copy(req.variants);

            var obj = { id: req.id || 0, parentId: req.parentId, contentTypeAlias: req.contentTypeAlias, templateAlias: req.template, expireDate: null, releaseDate: null };
            obj.variants = [];

            for (var i = 0; i < req.variants.length; i++) {
                var v = req.variants[i];
                var variant = { name: v.name, segment: v.segment, expireDate: v.expireDate, releaseDate: v.releaseDate, save: true, publish: false };
                variant.language = v.language;
                variant.tabs = v.tabs;
                obj.variants.push(variant);
            }
            var files = fileManager.getFiles();

            contentResource.save(obj, obj.id != 0 ? false : true, files, true).then(function (response) {

                if (response.notifications.filter(x => x.type.toLowerCase() === "error").length > 0) {
                    return;
                }

                // Merge response into existing content while preserving variant structure
                if ($scope.model && $scope.model.parentScope && $scope.model.parentScope.content) {
                    var currentContent = $scope.model.parentScope.content;

                    // Update only essential properties from response
                    currentContent.id = response.id;
                    currentContent.isDirty = false;

                    // Preserve variants from backup to maintain dropdown bindings
                    if (response.variants && response.variants.length > 0) {
                        response.variants.forEach(function (responseVariant, index) {
                            if (currentContent.variants[index]) {
                                // Update only essential properties from response
                                currentContent.variants[index].id = responseVariant.id;
                                currentContent.variants[index].isDirty = false;
                                currentContent.variants[index].state = responseVariant.state;
                                currentContent.variants[index].createDate = responseVariant.createDate;
                                currentContent.variants[index].updateDate = responseVariant.updateDate;

                                // Keep all original properties (including dropdown data and tabs)
                                // Do NOT replace the entire variant object
                            }
                        });
                    } else {
                        // If response doesn't have variants, restore from backup
                        currentContent.variants = variantsBackup;
                    }
                }

                // Mark form as pristine to remove "discard changes" warning
                if ($scope.model.parentScope.contentForm) {
                    $scope.model.parentScope.contentForm.$setPristine();
                }

                // Clear Umbraco's dirty tracking flags
                if ($scope.model.parentScope.content) {
                    $scope.model.parentScope.content.isDirty = false;
                    $scope.model.parentScope.content.variants.forEach(v => {
                        v.isDirty = false;
                    });
                }

                $scope.model.disableSubmitButton = false;
                $scope.submitting = false;

                vm.SubmitSchedule();

            }).catch(function (error) {
                console.error(error);
                $scope.model.disableSubmitButton = false;
                $scope.submitting = false;
            });
        };
        var now = new Date();
        var nowFormatted = moment(now).format("YYYY-MM-DD HH:mm");

        // Simple date picker config
        vm.datePickerPublishConfig = {
            enableTime: true,
            dateFormat: "Y-m-d H:i",
            time_24hr: true,
            minDate: nowFormatted,
            clickOpens: true
        };

        vm.datePickerUnpublishConfig = {
            enableTime: true,
            dateFormat: "Y-m-d H:i",
            time_24hr: true,
            minDate: nowFormatted,
            clickOpens: true
        };

        vm.datePickerSetup = function (type, datePickerInstance) {
            console.log("Date picker setup:", type, datePickerInstance);
            if (type === "publish") {
                vm.releaseDatePickerInstance = datePickerInstance;
            } else if (type === "unpublish") {
                vm.expireDatePickerInstance = datePickerInstance;
            }
        };

        vm.datePickerChange = function (dateStr, type) {
            console.log("Date changed:", type, dateStr);
            $timeout(function () {
                if (type === "publish") {
                    setPublishDate(dateStr);
                } else if (type === "unpublish") {
                    setUnpublishDate(dateStr);
                }
            });
        };

        function setPublishDate(date) {
            if (date) {
                vm.publishDateFormatted = getUTCTimeFormated(date);
                vm.publishAt = getDateTimeFormated(date);
            }
        }

        function setUnpublishDate(date) {
            if (date) {
                vm.unpublishDateFormatted = getUTCTimeFormated(date);
                vm.unpublishAt = getDateTimeFormated(date);
            }
        }

        vm.clearPublishDate = function () {
            vm.publishAt = null;
            vm.publishDateFormatted = null;
        };

        vm.clearUnpublishDate = function () {
            vm.unpublishAt = null;
            vm.unpublishDateFormatted = null;
        };

        function getUTCTimeFormated(date) {
            return moment.utc(new Date(date)).format("YYYY-MM-DD HH:mm");
        }
        function getDateTimeFormated(date) {
            return moment(new Date(date)).format("YYYY-MM-DD HH:mm");
        }
        vm.SubmitSchedule = function () {
            if (vm.publishAt && vm.publishDateFormatted) {
                var publishPayload = {
                    contentId: overlay.parentScope.content.id,
                    action: 0,
                    actionDate: vm.publishDateFormatted
                };
                $http.post("/umbraco/backoffice/customscheduler/add", publishPayload)
                    .then(function (response) {
                        if (response && !response.data.success) {
                            notificationsService.error(response.data.message);
                            $scope.model.disableSubmitButton = false;
                        }
                        else {
                            notificationsService.success("Publish Schedule added successfully");
                            overlay.submit = null;
                            $scope.model.close();
                        }
                    })
                    .catch(function (error) {
                        notificationsService.error("Error adding publish schedule");
                        $scope.model.disableSubmitButton = false;
                    });
            }
            if (vm.unpublishAt && vm.unpublishDateFormatted) {
                var unPublishPayload = {
                    contentId: overlay.parentScope.content.id,
                    action: 1,
                    actionDate: vm.unpublishDateFormatted
                };

                $http.post("/umbraco/backoffice/customscheduler/add", unPublishPayload)
                    .then(function (response) {
                        if (response && !response.data.success) {
                            notificationsService.error(response.data.message);
                            $scope.model.disableSubmitButton = false;
                        }
                        else {
                            notificationsService.success("Unpublish Schedule added successfully");
                            overlay.submit = null;
                            $scope.model.close();
                        }
                    })
                    .catch(function (error) {
                        notificationsService.error("Error adding unpublish schedule");
                        $scope.model.disableSubmitButton = false;
                    });
            }
        }

        // Format initial dates
        if (vm.publishAt || vm.unpublishAt) {
            $timeout(function () {
                vm.publishDateFormatted = vm.publishAt ? getUTCTimeFormated(vm.publishAt) : null;
                vm.unpublishDateFormatted = vm.unpublishAt ? getUTCTimeFormated(vm.unpublishAt) : null;
            }, 100);
        }
    }

    angular.module("umbraco")
        .controller("CustomSchedulerOverlayController", CustomSchedulerOverlayController);

})();