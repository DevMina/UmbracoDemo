angular.module('umbraco').controller("ContactUsGridController", ['$scope', '$http', '$filter', 'editorService', function ($scope, $http, $filter, editorService) {
    $scope.vm = this;
    $scope.baseURL = "/umbraco/backoffice/ContactUsReport";
    $scope.options = { orderBy: 'CreationDate', orderDirection: 'desc' };
    $scope.pageNumber = 1;
    $scope.dataLoaded = 0;
    $scope.searchResults = { items: null, totalPages: 1 };
    $scope.colums = [{ alias: 'Title', header: 'Title' },
    { alias: 'Category', header: 'Category' }, { alias: 'Nationality', header: 'Nationality' },
    { alias: 'ContactEmail', header: 'Email Address' }, { alias: 'ContactNumber', header: 'Phone Number' },
    { alias: 'NationalID', header: 'National ID' }, { alias: 'PassportNumber', header: 'Passport Number' },
    { alias: 'CreationDate', header: 'Submission Date', 'allowSorting': true }];
    $scope.categories = [{ 'name': 'كل الفئات', 'categoryId': 0 }];
    $scope.nationalities = [{ 'name': 'كل الجنسيات', 'id': 0 }];
    $scope.selectedCategory = 0;
    $scope.selectedNationality = 0;
    $scope.dateFrom = null;
    $scope.dateTo = null;
    $scope.canSearch = 0;
    $scope.canExport = 0;
    $scope.showDetailsPopup = false;
    $scope.ItemsCount = 0;
    $scope.DateInvalid = false;
    $scope.ExportInvalid = false;
    $scope.errorMessage = null;
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


    $scope.LoadFilter = function (firstload) {
        $scope.categories = [];
        $scope.nationalities = [];
        $scope.selectedCategory = 0;
        $scope.selectedNationality = 0;

        $http.get($scope.baseURL + "/GetCategories", $scope.config).then(function (response) {

            if (response.data) {
                $scope.categories = [{ 'name': 'الكل', 'categoryId': 0 }].concat(response.data.data);
            }
        }, onerror);

        $http.get($scope.baseURL + "/GetNationalities", $scope.config).then(function (response) {
            if (response.data) {
                $scope.nationalities = [{ 'name': 'الكل', 'id': 0 }].concat(response.data.data);
            }

            $scope.filterLoaded = 1;
            $scope.canSearch = 1;
            if (firstload) {
                $scope.doSearch(firstload);
            }

        }, onerror);
    }

    $scope.doSearch = function (reload) {
        if (!$scope.filterLoaded || !$scope.canSearch || $scope.DateInvalid)
            return;

        $scope.dataLoaded = 0;
        if (reload) {
            $scope.pageNumber = 1;
            pageIndex = 0;
        }
        else {
            pageIndex = $scope.pageNumber - 1;
        }

        var searchObj = $scope.getSearchFilter(pageIndex, 10);

        $http.post($scope.baseURL + "/GetContactUsRequests", searchObj, $scope.config).then(function (response) {
            search_callback(response.data);
        }, onerror);

        function search_callback(res) {
            var arr = [];
            var data = res?.data?.result;

            if (data) {
                var items = data.items;

                if (items && items?.length > 0) {
                    $scope.canExport = 1;
                    var length = items.length, obj, item;

                    for (var i = 0; i < length; i++) {
                        item = items[i];
                        obj = {
                            id: item.id, name: item.name, Title: item.subject, Category: item.category,
                            Nationality: item.nationality, ContactEmail: item.emailAddress, ContactNumber: item.phoneNumber,
                            NationalID: item.nationalID ? item.nationalID : '---', PassportNumber: item.passportNumber ? item.passportNumber : '---',
                            CreationDate: $filter('date')(item.submissionDate, "MM/dd/yyyy h:mm:ss"), editPath: "/content/content/edit/" + item.id
                        };
                        arr.push(obj);
                    }
                    $scope.searchResults = { items: arr, totalPages: data.pagesCount };
                    $scope.ItemsCount = data.totalCount;

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
            if (res.notifications?.length > 0) {
                $scope.errorMessage = res.notifications[0];
                $scope.ExportInvalid = true;
            }
            $scope.dataLoaded = 1;
        }
    }

    $scope.searchTextChange = function () {
        $scope.errorMessage = null;
        $scope.canExport = 1;
    }

    $scope.filterTextKeypress = function ($event) {

        if ($event.keyCode === 13) {
            $scope.doSearch();
        }
    }

    $scope.clear = function () {
        $scope.searchText = null;
        $scope.selectedCategory = 0;
        $scope.selectedNationality = 0;
        $scope.dateFrom = null;
        $scope.dateTo = null;
        $scope.ExportInvalid = false;
        $scope.DateInvalid = false;
        $scope.clearDate("dateFrom");
        $scope.clearDate("dateTo");
        $scope.doSearch(1);
    }

    $scope.clearDate = function (date) {
        $scope[date] = null;
        let currentFlatpickrInstance = document.querySelector("#" + date + " .flatpickr-input")._flatpickr;
        currentFlatpickrInstance.setDate(null);
        $scope.DateInvalid = false;
    }

    /* Export */
    $scope.export = function () {
        $scope.ExportInvalid = false;
        $scope.showExportLoader = true;
        if (!$scope.canSearch || $scope.DateInvalid)
            return;

        var filterationObj = $scope.getSearchFilter(0, 0);
        $http.post($scope.baseURL + "/ExportContactUs", filterationObj, $scope.config).then(function (res) {
            res = res.data;
            if (res) {
                if (res.notifications) {
                    $scope.errorMessage = res.notifications[0];
                    var length = res.notifications.length;
                    $scope.ExportInvalid = length > 0;
                }
                else {
                    Download(res.data, true);
                }
            }
            $scope.showExportLoader = false;
        }, onerror);
    }

    /* Search Filteration */
    $scope.getSearchFilter = function (pageIndex, pageSize) {
        var searchObj = {
            filtrationCriteria: {
                category: $scope.selectedCategory || 0,
                nationality: $scope.selectedNationality || 0,
                dateFrom: $scope.dateFrom,
                dateTo: $scope.dateTo,
                searchText: $scope.searchText
            }
            , listOrdering: { fieldName: $scope.options.orderBy, direction: $scope.options.orderDirection }
            , pageIndex: pageIndex
            , pageSize: pageSize
        };
        return searchObj;
    }
    /* Paging */
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
    /* Get Item Details */
    $scope.clickItem = function (item) {
        if (item.editPath) {
            OpenURL('/umbraco/#' + item.editPath + '?mculture=ar-EG');
        }
    }

    /*Sorting*/
    $scope.isSortDirection = function (col, direction) {
        col = col.toLowerCase();
        var isSort = $scope.colums.filter(x => x.alias.toLowerCase() === col && x.allowSorting)[0];
        return isSort && $scope.options.orderBy.toLowerCase() === col && $scope.options.orderDirection === direction;
    }

    $scope.sort = function (field) {
        var isSort = $scope.colums.filter(x => x.alias.toLowerCase() === field.toLowerCase() && x.allowSorting)[0];
        if (isSort) {
            $scope.options.orderDirection = "asc" === $scope.options.orderDirection ? "desc" : "asc";
            $scope.options.orderBy = field;
            $scope.doSearch();
        }
    }

    function onerror(res) {
        $scope.dataLoaded = 1;
        $scope.showExportLoader = false;
        console.log(res.statusText);
    }

    $scope.dateFromPickerChange = function (selectedDates, dateStr, instance) {
        $scope.dateFrom = dateStr;
        $scope.ValidateDate();
    }

    $scope.dateToPickerChange = function (selectedDates, dateStr, instance) {
        $scope.dateTo = dateStr;
        $scope.ValidateDate();
    }

    $scope.ValidateDate = function () {
        $scope.DateInvalid = $scope.dateFrom && $scope.dateTo && new Date($scope.dateFrom) > new Date($scope.dateTo);

    }

    function scrollTop() {
        var obj = $(".umb-table");
        if (obj) {
            var view = obj.closest('.report-wrapper');
            if (view && view.length > 0)
                view[0].scrollTop = view.offset().top;
        }
    }


    $scope.LoadFilter(1);
}]);


