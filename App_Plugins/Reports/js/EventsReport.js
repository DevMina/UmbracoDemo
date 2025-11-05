angular.module('umbraco').controller("EventsGridController", ['$scope', '$http', function ($scope, $http) {
    $scope.vm = this;
    $scope.baseURL = "/umbraco/backoffice/EventsReport";
    $scope.options = { orderBy: 'startDate', orderDirection: 1 };
    $scope.pageNumber = 1;
    $scope.dataLoaded = 0;
    $scope.searchResults = { items: null, totalPages: 0 };
    $scope.colums = [{ alias: 'eventCategory', header: 'Event Category' }, { alias: 'eventSubCategory', header: 'Event Sub Category' },
        { alias: 'startDate', header: 'Start Date', 'allowSorting': true }, { alias: 'endDate', header: 'End Date' },
    { alias: 'location', header: 'Location' }];
    $scope.categories = [{ 'title': 'الكل', 'id': 0 }];
    $scope.selectedCategory = 0;
    $scope.eventsTypes = [
        { 'title': 'الكل', 'id': 0 },
        { 'title': 'الفعاليات الحالية والمقبلة', 'id': 2 },
        { 'title': 'الفعاليات السابقة', 'id': 1 }];
    $scope.selectedEventsType = 0;
    $scope.dateFrom = null;
    $scope.dateTo = null;
    $scope.canSearch = 0;
    $scope.canExport = 0;
    $scope.showDetailsPopup = false;
    $scope.ItemsCount = 0;
    $scope.ExportInvalid = false;
    $scope.showExportLoader = false;
    $scope.datePickerSingle = {
        view: "datepicker",
        config: {
            pickDate: true,
            pickTime: false,
            pick12HourFormat: false,
            format: "D MMM YYYY"
        }
    };
    $scope.searchText = "";
    $scope.config = {
        headers: {
            'Accept-language': 'ar-eg'
        }
    };

    $scope.getCategories = function (firstload) {
        $scope.categories = [];
        $scope.selectedCategory = 0;
        $scope.filterLoaded = 1;
        $scope.doSearch(firstload);
        $http.get($scope.baseURL + "/GetEventsCategories", $scope.config).then(function (response) {
            if (response.data) {
                $scope.categories = [{ 'id': 0, 'title': 'الكل' }].concat(response.data.data);
            }
            else {
                $scope.categories = [];
            }
            $scope.selectedCategory = 0;
            $scope.filterLoaded = 1;
            if ($scope.categories.length > 0)
                $scope.canSearch = 1;
            if (firstload) {
                $scope.doSearch(firstload);
            }

        }, onerror);
    }

    $scope.doSearch = function (reload, isSorting) {
        if (!$scope.filterLoaded || !$scope.canSearch || $scope.vm.dateInvalid)
            return;

        $scope.dataLoaded = 0;
        if (reload) {
            $scope.pageNumber = 1;
            pageIndex = 0;
        }
        else {
            pageIndex = $scope.pageNumber - 1;
        }

        if (isSorting != 1) {
            if ($scope.selectedEventsType == 0) {// All events
                $scope.options.orderDirection = 1; //default order
            }
            else if ($scope.selectedEventsType == 1) {// Historical events
                $scope.options.orderDirection = 1; //default order
            }
            else if ($scope.selectedEventsType == 2) {// Current and Upcoming Events
                $scope.options.orderDirection = 0; //default order
            }
        }

        var searchObj = getSearchFilter(pageIndex, 10);
        $http.post($scope.baseURL + "/GetEvents", searchObj, $scope.config).then(function (response) {
            search_callback(response.data, searchObj);
        }, onerror);

        function search_callback(res, searchObj) {
            var arr = [];
            var data = res.data;
            if (data) {
                var events = [];
                if (searchObj.filtrationCriteria.eventType == 0)
                    events = data?.allEvents?.items;
                else if (searchObj.filtrationCriteria.eventType == 1)
                    events = data?.historicalEvents?.items;
                else if (searchObj.filtrationCriteria.eventType == 2)
                    events = data?.currentAndFutureEvents?.items;
                
                if (events && events?.length > 0) {
                    $scope.canExport = 1;
                    var length = events.length, obj, item;
                    for (var i = 0; i < length; i++) {
                        item = events[i];
                        obj = {
                            id: item.id, name: item.title, eventCategory: item.eventCategory, eventSubCategory: item.eventSubCategory, startDate: item.startDate,
                            endDate: item.endDate, location: item.location, editPath: "/content/content/edit/" + item.id
                        };
                        arr.push(obj);
                    }
                    let totalPages = 0;

                    if (searchObj.filtrationCriteria.eventType == 0) {
                        $scope.ItemsCount = data?.allEvents?.totalCount;
                        totalPages = data?.allEvents?.pagesCount;
                    }
                    else if (searchObj.filtrationCriteria.eventType == 1) {
                        $scope.ItemsCount = data?.historicalEvents?.totalCount;
                        totalPages = data?.historicalEvents?.pagesCount;
                    }
                    else if (searchObj.filtrationCriteria.eventType == 2) {
                        $scope.ItemsCount = data?.currentAndFutureEvents?.totalCount;
                        totalPages = data?.currentAndFutureEvents?.pagesCount;
                    }
                    

                    $scope.searchResults = { items: arr, totalPages: totalPages };
                }
                else {
                    $scope.searchResults = { items: null, totalPages: 0 };
                    $scope.ItemsCount = 0;
                    $scope.canExport = 0;
                }

            }
            else {
                $scope.searchResults = { items: null, totalPages: 0 };
                $scope.ItemsCount = 0;
                $scope.canExport = 0;
            }
            $scope.dataLoaded = 1;
        }
    }

    $scope.filterTextKeypress = function ($event) {
        if ($event.keyCode === 13) {
            $scope.doSearch();
        }
    }

    $scope.clear = function () {
        $scope.searchText = null;
        $scope.selectedCategory = 0;
        $scope.selectedEventsType = 0;
        $scope.dateFrom = null;
        $scope.dateTo = null;
        $scope.ExportInvalid = false;
        $scope.doSearch(1,0);
        $scope.vm.dateInvalid = false;
        $scope.clearDate('dateFrom');
        $scope.clearDate('dateTo');
    }

    $scope.next = function () {
        $scope.pageNumber++;
        $scope.doSearch();
        scrollTop();
    }

    $scope.prev = function () {
        $scope.pageNumber--;
        $scope.doSearch();
        scrollTop();
    }

    $scope.goToPage = function (page) {
        $scope.pageNumber = page;
        $scope.doSearch();
        scrollTop();
    }

    $scope.clickItem = function (item) {
        if (item.editPath) {
            OpenURL('/umbraco/#' + item.editPath + '?mculture=ar-EG');
        }
    }

    $scope.clearDate = function (date) {
        $scope[date] = null;
        let currentFlatpickrInstance = document.querySelector("#" + date + " .flatpickr-input")._flatpickr;
        currentFlatpickrInstance.setDate(null);
        $scope.vm.validateDate();
    }

    /*Export*/
    $scope.export = function () {
        $scope.ExportInvalid = false;
        $scope.showExportLoader = true;
        var filter = getSearchFilter(0, 0);
        $http.post($scope.baseURL + "/ExportEvents", filter, $scope.config).then(function (res) {
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

    $scope.vm.validateDate = function () {
        $scope.vm.dateInvalid = $scope.dateFrom && $scope.dateTo && new Date($scope.dateFrom) > new Date($scope.dateTo);
    }

    function getSearchFilter(pageIndex, pageSize) {
        return {
            filtrationCriteria: {
                searchTerms: $scope.searchText,
                eventCategoryId: $scope.selectedCategory || 0,
                dateFrom: $scope.dateFrom,
                dateTo: $scope.dateTo,
                eventType: $scope.selectedEventsType || 0
            }
            , sortingcriteria: {
                sortcriteria: 0,
                sortdirection: $scope.options.orderDirection
            }
            , pageIndex: pageIndex
            , pageSize: pageSize
        };
    }

    /*Sorting*/
    $scope.isSortDirection = function (col, direction) {
        col = col.toLowerCase();
        var isSort = $scope.colums.filter(x => x.alias.toLowerCase() === col && x.allowSorting)[0];
        var orderDirection = 1;
        if (direction === 'asc')
            orderDirection = 0;
        return isSort &&  $scope.options.orderBy.toLowerCase() === col && $scope.options.orderDirection === orderDirection;
    }

    $scope.sort = function (field) {
        var isSort = $scope.colums.filter(x => x.alias.toLowerCase() === field.toLowerCase() && x.allowSorting)[0];
        if (isSort) {
            $scope.options.orderDirection = 0 === $scope.options.orderDirection ? 1 : 0;
            $scope.options.orderBy = field;
            $scope.doSearch($scope.filterLoaded, 1);
        }
    }

    $scope.dateFromPickerChange = function (selectedDates, dateStr, instance) {
        $scope.dateFrom = dateStr;
        $scope.vm.validateDate();
    }

    $scope.dateToPickerChange = function (selectedDates, dateStr, instance) {
        $scope.dateTo = dateStr;
        $scope.vm.validateDate();
    }

    function onerror(res) {
        $scope.dataLoaded = 1;
        $scope.showExportLoader = false;
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


    $scope.getCategories(1);
}]);


