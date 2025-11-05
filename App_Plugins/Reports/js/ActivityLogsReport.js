(function () {
    angular.module("umbraco.directives").component("umbActivityLogsTable", {
        template: '<div class="umb-table" ng-if="vm.items"><div class="umb-table-head"><div class="umb-table-row"><div class="umb-table-cell"></div><div class="umb-table-cell umb-table__name"><button type="button" class="umb-table-head__link sortable" ng-click="vm.sort(\'Name\', true, true)"><localize key="general_name">Name</localize><i class="umb-table-head__icon icon" aria-hidden="true" ng-class="{\'icon-navigation-up\': vm.isSortDirection(\'Name\', \'asc\'), \'icon-navigation-down\': vm.isSortDirection(\'Name\', \'desc\')}"></i></button></div><div class="umb-table-cell" ng-repeat="column in vm.itemProperties track by column.alias"><button type="button" class="umb-table-head__link" ng-click="vm.sort(column.alias, column.allowSorting, column.isSystem)" ng-class="{\'sortable\':column.allowSorting}"><span ng-bind="column.header"></span><i class="umb-table-head__icon icon" aria-hidden="true" ng-class="{\'icon-navigation-up\': vm.isSortDirection(column.alias, \'asc\'), \'icon-navigation-down\': vm.isSortDirection(column.alias, \'desc\')}"></i></button></div></div></div><div class="umb-table-body"><div class="umb-table-row -selectable umb-outline" ng-repeat="item in vm.items track by $index" ng-class="{\'-selected\':item.selected, \'-light\':!item.published && item.updater != null}" ng-click="vm.selectItem(item, $index, $event)"><div class="umb-table-cell"></div><div class="umb-table-cell umb-table__name" ng-if="!item.isTrashed"><a title="{{item.name}}" class="umb-table-body__link" ng-href="{{\'#\' + item.editPath}}" ng-click="vm.clickItem(item, $event)" ng-bind="item.name"></a></div><div class="umb-table-cell umb-table__name" ng-if="item.isTrashed"><span style="cursor:default">{{item.name}}</span></div><div class="umb-table-cell" ng-repeat="column in vm.itemProperties track by column.alias"><span title="{{column.header}}: {{item[column.alias]}}"><div>{{item[column.alias]}}</div></span></div></div></div></div>',

        controller: function TableController() {
            var vm = this;
            vm.clickItem = function (item, $event) {
                !vm.onClick || $event.metaKey || $event.ctrlKey || (vm.onClick({ item: item }), $event.preventDefault()), $event.stopPropagation();
            }
            vm.actionClick = function (item, actionName, $event) {
                item.actionName = actionName;
                !vm.onActionClick || $event.metaKey || $event.ctrlKey || (vm.onActionClick({ item: item }), $event.preventDefault()), $event.stopPropagation();
            }
            vm.isSortDirection = function (col, direction) {
                if (vm.onSortingDirection) return vm.onSortingDirection({ col: col, direction: direction });
            }
            vm.sort = function (field, allow, isSystem) {
                vm.onSort && vm.onSort({ field: field, allow: allow, isSystem: isSystem });
            }
        },
        controllerAs: "vm",
        bindings: { items: "<", itemProperties: "<", allowSelectAll: "<", onSelect: "&", onClick: "&", onActionClick: "&", onSelectAll: "&", onSelectedAll: "&", onSortingDirection: "&", onSort: "&" },
    });

    angular.module('umbraco').controller("ActivityLogsGridController",
        ['$http', '$scope', function ($http, $scope) {
            var vm = this;
            vm.baseURL = "/umbraco/backoffice/ActivityLog";
            vm.options = { orderBy: 'createDate', orderDirection: 'desc' };
            vm.pageNumber = 1;
            vm.dataLoaded = 0;
            vm.searchResults = { items: null, totalPages: 0 };
            var basicCols, colsWithEdit, colsWithDelete;
            vm.colums = basicCols = [{ alias: 'titleAR', header: 'Arabic Title' }, { alias: 'titleEN', header: 'English Title' }
                , { alias: 'contentType', header: 'Content Type' }, { alias: 'createdBy', header: 'Created By' }
                , { alias: 'createDate', header: 'Create Date', 'allowSorting': true }];

            colsWithEdit = basicCols.concat([{ alias: 'modifiedBy', header: 'Modified By' }, { alias: 'updateDate', header: 'Update Date', 'allowSorting': true }]);
            colsWithDelete = basicCols.concat([{ alias: 'deletedBy', header: 'Deleted By' }, { alias: 'deleteDate', header: 'Deleted Date', 'allowSorting': true }])
            vm.Type = 1;
            vm.users = [];
            vm.contentTypes = [];
            vm.canSearch = 0;
            $scope.createdBy = 0;
            $scope.deletedBy = 0;
            $scope.modifiedBy = 0;
            $scope.contentType = "0";
            $scope.ItemsCount = 0;
            $scope.ExportInvalid = false;
            $scope.showExportLoader = false;
            vm.createDateInvalid = vm.updateDateInvalid = vm.deleteDateInvalid = false;
            $scope.datePickerSingle = {
                view: "datepicker",
                config: {
                    pickDate: true,
                    pickTime: false,
                    pick12HourFormat: false,
                    format: "D MMM YYYY"
                }
            };


            vm.LoadFilter = function () {
                $http.get(vm.baseURL + "/GetContentTypes").then(function (response) {
                    var data = response.data.data;
                    if (data) {
                        vm.contentTypes = data;
                    }
                }, onerror);
                $http.get(vm.baseURL + "/GetBackOfficeUsers").then(function (response) {
                    vm.canSearch = 1;
                    var data = response.data.data;
                    if (data) {
                        vm.users = data;
                    }
                    vm.Search();
                }, function (res) { vm.canSearch = 1; onerror(res); });
            }

            vm.Search = function (reload, sorting) {
                if (!vm.canSearch || vm.createDateInvalid || vm.updateDateInvalid || vm.deleteDateInvalid)
                    return;
                vm.colums = vm.Type == 4 ? colsWithDelete : colsWithEdit;
                vm.dataLoaded = 0;

                if (reload) {
                    vm.pageNumber = 1;
                    pageIndex = 0;
                }
                else {
                    pageIndex = vm.pageNumber - 1;
                }
                var searchObj = getSearchFilter(pageIndex, 10);
                if (!sorting) {
                    var field;
                    if (vm.Type == 4)
                        field = 'deleteDate';
                    else if (vm.Type == 3)
                        field = 'updateDate';
                    else
                        field = 'createDate';
                    vm.options.orderBy = searchObj.listOrdering.fieldName = field;
                    vm.options.orderDirection = searchObj.listOrdering.direction = 'desc';
                }
                $http.post(vm.baseURL + "/Search", searchObj).then(function (response) {
                    var res = response.data.data;
                    if (res == null || res.result == null) {
                        console.log("No data found for ActivityLogsReport.");
                        return;
                    }
                    var arr = [];
                    var data = res.result.items;
                    $scope.ItemsCount = res.result.totalCount;

                    if (data && data.length > 0) {
                        var length = data.length, obj, item;
                        for (var i = 0; i < length; i++) {
                            item = data[i];
                            obj = {
                                id: item.id, name: item.contentName, titleAR: item.titleAR, titleEN: item.titleEN
                                , titleFR: item.titleFR, createdBy: item.createdBy
                                , createDate: item.createDate, updateDate: item.updateDate
                                , editPath: "/content/content/edit/" + item.id
                                , contentType: item.contentType
                                , modifiedBy: item.modifiedBy
                                , deletedBy: item.deletedBy
                                , deleteDate: item.deleteDate
                                , isTrashed: item.isTrashed
                            };
                            arr.push(obj);
                        }
                        vm.searchResults = { items: arr, totalPages: res.result.pagesCount };
                    }
                    else {
                        vm.searchResults = { items: null, totalPages: 0 };
                    }
                    vm.dataLoaded = 1;
                }, onerror);
            }

            vm.clear = function () {
                $scope.createDateFrom = $scope.createDateTo = $scope.updateDateFrom = $scope.updateDateTo = null;
                $scope.deleteDateFrom = $scope.deleteDateTo = null;
                $scope.createdBy = 0;
                $scope.modifiedBy = 0;
                $scope.deletedBy = 0;
                $scope.contentType = "0";
                $scope.ExportInvalid = false;
                vm.createDateInvalid = vm.updateDateInvalid = vm.deleteDateInvalid = false;
                vm.clearDate('createDateFrom');
                vm.clearDate('createDateTo');
                vm.clearDate('updateDateFrom');
                vm.clearDate('updateDateTo');
                vm.clearDate('deleteDateFrom');
                vm.clearDate('deleteDateTo');
                vm.Search(1, 0);
            }

            vm.changeType = function (type) {
                vm.Type = type;

                if (vm.Type === "4") {
                    $scope.modifiedBy = 0;
                    $scope.updateDateFrom = $scope.updateDateTo = null;
                    vm.updateDateInvalid = false;
                    vm.clearDate('updateDateFrom');
                    vm.clearDate('updateDateTo');
                }
                else {
                    $scope.deletedBy = 0;
                    vm.deleteDateInvalid = false;
                    vm.clearDate('deleteDateFrom');
                    vm.clearDate('deleteDateTo');
                }

            }

            vm.clickItem = function (item) {
                if (item.editPath) {
                    OpenURL('/umbraco/#' + item.editPath + '?mculture=ar-EG');
                }
            }

            vm.clearDate = function (date) {
                $scope[date] = null;
                let currentFlatpickrInstance = document.querySelector("#" + date + " .flatpickr-input")._flatpickr;
                currentFlatpickrInstance.setDate(null);

                if (date && date.includes('createDate'))
                    vm.createDateInvalid = false;
                else if (date && date.includes('updateDate'))
                    vm.updateDateInvalid = false;
                else if (date && date.includes('deleteDate'))
                    vm.deleteDateInvalid = false;
            }

            vm.export = function () {
                $scope.showExportLoader = true;
                $scope.ExportInvalid = false;
                var filter = getSearchFilter(0, 0);
                $http.post(vm.baseURL + "/Export", filter).then(function (res) {
                    res = res.data;
                    if (res) {
                        if (res.notifications) {
                            var length = res.notifications.length;
                            $scope.ExportInvalid = length > 0;
                            for (var i = 0; i < length; i++) {
                                console.log(res.notifications[i]);
                            }
                        }
                        else {
                            Download(res.data, true);
                        }
                    }
                    $scope.showExportLoader = false;
                }, onerror);
            }

            vm.validateCreateDate = function () {
                vm.createDateInvalid = $scope.createDateFrom && $scope.createDateTo && new Date($scope.createDateFrom) > new Date($scope.createDateTo);
            }

            vm.validateUpdateDate = function () {
                vm.updateDateInvalid = $scope.updateDateFrom && $scope.updateDateTo && new Date($scope.updateDateFrom) > new Date($scope.updateDateTo);
            }

            vm.validateDeleteDate = function () {
                vm.deleteDateInvalid = $scope.deleteDateFrom && $scope.deleteDateTo && new Date($scope.deleteDateFrom) > new Date($scope.deleteDateTo);
            }

            vm.isSortDirection = function (col, direction) {
                col = col.toLowerCase();
                var isSort = vm.colums.filter(x => x.alias.toLowerCase() === col && x.allowSorting)[0];
                return isSort && vm.options.orderBy.toLowerCase() === col && vm.options.orderDirection === direction;
            }

            vm.sort = function (field) {
                var isSort = vm.colums.filter(x => x.alias.toLowerCase() === field.toLowerCase() && x.allowSorting)[0];
                if (isSort) {
                    vm.options.orderDirection = "asc" === vm.options.orderDirection ? "desc" : "asc";
                    vm.options.orderBy = field;
                    vm.Search(0, 1);
                }
            }

            $scope.datePickerChange = function (selectedDates, dateStr, instance, alias) {
                $scope[alias] = dateStr;
                if (alias == 'createDateFrom' || alias == 'createDateTo') {
                    vm.validateCreateDate();
                }
                else if (alias == 'updateDateFrom' || alias == 'updateDateTo') {
                    vm.validateUpdateDate();
                }
                else if (alias == 'deleteDateFrom' || alias == 'deleteDateTo') {
                    vm.validateDeleteDate();
                }
            }

            // Pagination
            vm.next = function () {
                vm.pageNumber++;
                vm.Search(0, 1);
                scrollTop();
            }

            vm.prev = function () {
                vm.pageNumber--;
                vm.Search(0, 1);
                scrollTop();
            }

            vm.goToPage = function (page) {
                vm.pageNumber = page;
                vm.Search(0, 1);
                scrollTop();
            }

            //Helpers
            function getSearchFilter(pageIndex, pageSize) {
                var filter = {
                    activityLogReportType: vm.Type
                    , listOrdering: { fieldName: vm.options.orderBy, direction: vm.options.orderDirection }
                    , pageIndex: pageIndex
                    , pageSize: pageSize
                    , createDateFrom: $scope.createDateFrom
                    , createDateTo: $scope.createDateTo
                    , createdBy: $scope.createdBy
                    , contentType: $scope.contentType == '0' ? null : $scope.contentType
                };
                if (vm.Type == 4) { // Deleted
                    filter.deletedBy = $scope.deletedBy;
                    filter.deleteDateFrom = $scope.deleteDateFrom;
                    filter.deleteDateTo = $scope.deleteDateTo;
                }
                else {
                    filter.updateDateFrom = $scope.updateDateFrom;
                    filter.updateDateTo = $scope.updateDateTo;
                    filter.modifiedBy = $scope.modifiedBy;
                }
                return filter;
            }

            function onerror(res) {
                $scope.showExportLoader = false;
                vm.dataLoaded = 1;
                console.log(res.statusText);
            }

            function scrollTop() {
                var obj = $(".umb-table");
                if (obj) {
                    var view = obj.closest('.report-wrapper');
                    if (view && view.length > 0)
                        view[0].scrollTop = view.offset().top;
                }
            }



            vm.LoadFilter();
        }]);
})();
