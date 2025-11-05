var cultures = { "en-US": "English", "ar-EG": "Arabic" };
var validImageTypes = [".jpg", ".jpeg", ".jpe", ".webp"];
var validVideoTypes = [".mp4", ".webm"];
var videoType = ".mp4";
var docType = ".pdf";
var customImages = ["relatedPartiesItem_logo"];
var customPngImages = ["kPI_kPIImage", "sector_icon", "partner_logo", "mediaCenterItem_mediaIcon", "successStory_logo"];
var videoIds = {};
var externalURLAlias = "externalurl";
var contentTypesDic = {
    "contentTemplate3": "Content Template3 With KPIs",
    "contentTemplateDetails": "Content Template Details",
    "contentTemplateDetailsPage": "Simple Template with Related Media"
};
var allowedSchedule = ["news", "newsItem", "announcement", "event", "events", "whatGafiOffersItem", "mediaCenter", "publications", "publication", "successStories", "successStory", "testmonial", "tesmonials", "partners", "partner", "contentTemplate3", "contentTemplateDetails", "contentTemplateDetailsPage", "sector", "sectors", "egyptIsReadyItem", "contactUs", "photoAlbums", "photoAlbum", "videoAlbums", "videoAlbum", "contentTemplate4","booklets"];

(function () {

    var _contentResource, _fileManager, _contentEditingHelper, _filter;
    var maxImageSize = 2, maxVideoSize = 11, maxDocSize = 2;
    var videoSize = maxVideoSize * 1024 * 1024;
    var ImgSize = maxImageSize * 1024 * 1024;
    var DocSize = maxDocSize * 1024 * 1024;
    var maxFileNameLen = 80;

    var _baseUrl = 'https://' + location.host.split(':')[0] + (location.port ? ':' + location.port : '');

    angular.module('umbraco.services').config([
        '$httpProvider', function ($httpProvider) {

            $httpProvider.interceptors.push(['$q', function ($q) {
                return {
                    request: function (request) {
                        var errors;
                        if (request) {

                            if (request.url === "/umbraco/backoffice/umbracoapi/content/PostSave") {
                                errors = beforeSave(request);
                            }
                            else if (request.url === "/umbraco/backoffice/umbracoapi/media/PostSave" || request.url === "/umbraco/backoffice/umbracoapi/media/PostAddFile") {
                                errors = validateFiles();
                            }
                            else if (request.url === "/app_plugins/SimpleTreeMenu/Views/dialog.html") {
                                request.url = "/app_plugins/MainMenuNav/Views/dialog.html";
                            }
                            else if (request.url.includes("/propertyeditors/mediapicker3/mediapicker3.html")) {
                                request.url = "/App_Plugins/Custom/views/mediapicker3.html";
                            }
                            else if (request.url.includes("/propertyeditors/imagecropper/imagecropper.html")) {
                                request.url = "/App_Plugins/CustomFields/views/img-cropper-custom.html";
                            }
                            //below URL is for intercepting publish API call and rerouting to custom controller to solve issue with publishing with two cultures with validation errors
                            else if (request.url.includes("/umbraco/backoffice/umbracoapi/content/PostPublishByIdAndCulture")) {
                                request.url = "/umbraco/backoffice/CustomApi/CustomContent/PostPublishByIdAndCulture";
                            }
                            else if (request.url.includes("/content/overlays/schedule.html")) {
                                request.url = "/App_Plugins/CustomScheduler/scheduler.html";
                            }
                            if (errors && errors.length > 0) {
                                if (_notificationsService) {
                                    for (var i = 0; i < errors.length; i++) {
                                        _notificationsService.error(errors[i]);
                                    }
                                    return $q.reject(request);
                                }
                            }
                        }
                        return request;
                    },
                    responseError: function (response) {
                        var data = response.data;
                        var config = response.config;
                        if (data) {
                            if (data.ExceptionMessage && config && config.url === "/umbraco/backoffice/umbracoapi/content/PostSave" && config.data.key === "contentItem" && config.data.value.action === "publishNew") {
                                var req = config.data.value;
                                var obj = { id: req.id || 0, name: req.name, parentId: req.parentId, contentTypeAlias: req.contentTypeAlias };
                                obj.variants = [];

                                for (var i = 0; i < req.variants.length; i++) {
                                    var v = req.variants[i];
                                    var variant = { name: v.name, segment: v.segment, expireDate: v.expireDate, releaseDate: v.releaseDate, save: v.save, publish: false };
                                    variant.language = { culture: v.culture };

                                    var tabs = variant.tabs = [];
                                    var prop, props = [];

                                    for (var j = 0; j < v.properties.length; j++) {
                                        prop = v.properties[j];
                                        prop.alias.startsWith("_umb_") || prop.readonly || props.push({ id: prop.id, alias: prop.alias, value: prop.value });
                                    }
                                    tabs.push({ properties: props });
                                    obj.variants.push(variant);
                                }

                                var files = _fileManager.getFiles();

                                // Save new content without publishing
                                _contentResource.save(obj, true, files, true).then(function () { }).catch(function (error) {
                                });
                                data.ExceptionMessage = data.ExceptionType = data.StackTrace = "";
                                response.status = 200;
                                response.statusText = "success";
                            }
                            else if (data.ErrorMessage) {
                                _notificationsService.error(data.ErrorMessage);
                            }
                            else if (data.ExceptionMessage || data.ExceptionType) {
                                data.ExceptionMessage = data.ExceptionType = data.StackTrace = "";
                                response.status = 200;
                                _notificationsService.error("Server error: contact administrator");
                            }
                        }
                        return $q.reject(response);
                    },
                    response: function (response) {

                        var config = response.config;
                        if (config) {
                            if (config.url.includes("/umbraco/backoffice/umbracoapi/content/GetChildren")) {
                                var responseData = response.data;
                                if (responseData && responseData.items && responseData.items.length > 0) {
                                    var items = responseData.items, item;
                                    for (var i = 0; i < items.length; i++) {
                                        item = items[i];
                                        item = formatItemDate(item);
                                        if (item.contentTypeAlias) {
                                            item.contentTypeAlias = contentTypesDic[item.contentTypeAlias] || item.contentTypeAlias;
                                        }
                                    }
                                }
                            }
                            else if (config.url.indexOf("views/users/views/users/users.html") > -1) {
                                if (Umbraco.Sys.ServerVariables.umbracoSettings.showUserInvite) {
                                    Umbraco.Sys.ServerVariables.umbracoSettings.showUserInvite = false;
                                }
                            }
                            else if (config.url === "/umbraco/backoffice/umbracoapi/dashboard/GetDashboard?section=content") {
                                if (response.data && response.data[0]) {
                                    response.data = [response.data[0]];
                                }
                            }
                            else if (config.url === "/umbraco/backoffice/umbracoapi/content/PostUnpublish") {
                                //In case unpublish operation is canceled in handler, there are still appear success messages with error messages, so call this method to filter these messages.
                                response = filterNotifications(response);
                            }
                        }
                        return response;
                    }
                };
            }]);
        }])
        .run(['notificationsService', 'contentResource', 'fileManager', 'contentEditingHelper', '$filter', 'tinyMceService', function (notificationsService, contentResource, fileManager, contentEditingHelper, $filter, tinyMceService) {
            _notificationsService = notificationsService;
            _contentResource = contentResource;
            _fileManager = fileManager;
            _contentEditingHelper = contentEditingHelper;
            _filter = $filter;
            _tinyMceService = tinyMceService;

            _contentEditingHelper.getAllProps = function (content) {
                var allProps = [];
                if (content.tabs) {
                    for (var i = 0; i < content.tabs.length; i++) {
                        var props = content.tabs[i].properties;
                        for (var p = 0; p < props.length; p++)
                            allProps.push(props[p]);
                    }
                }
                return allProps;
            }
            _tinyMceService.insertLinkInEditor = function (editor, target, anchorElm) {
                var href = target.url
                    , id = !!target.udi ? target.udi : target.id ? target.id : null;
                if (target.anchor && "?" !== target.anchor[0] && "#" !== target.anchor[0] && (target.anchor = (-1 === target.anchor.indexOf("=") ? "#" : "?") + target.anchor),
                    !target.anchor && href) {
                    var urlParts = href.split(/(#|\?)/);
                    3 === urlParts.length && (href = urlParts[0],
                        target.anchor = urlParts[1] + urlParts[2])
                }
                function createElemAttributes() {
                    var a = {
                        href: href,
                        title: target.name,
                        target: target.target ? target.target : null,
                        rel: target.rel ? target.rel : null
                    };
                    return target.anchor ? (a["data-anchor"] = target.anchor,
                        a.href = a.href + target.anchor) : a["data-anchor"] = null,
                        a
                }
                function insertLink() {
                    if (anchorElm)
                        editor.dom.setAttribs(anchorElm, createElemAttributes()),
                            editor.selection.select(anchorElm),
                            editor.execCommand("mceEndTyping");
                    else if ("" !== editor.selection.getContent())
                        editor.execCommand("mceInsertLink", !1, createElemAttributes());
                    else {
                        var linkContent = void 0 !== target.name && "" !== target.name ? target.name : target.url
                            , domElement = editor.dom.createHTML("a", createElemAttributes(), linkContent);
                        editor.execCommand("mceInsertContent", !1, domElement)
                    }
                }

                if (href && href.includes('/media/')) {
                    href.indexOf(':') > -1 ? insertLink() : (href = _baseUrl + href, insertLink());
                }
                else if (href && id) {
                    href = (href, insertLink());
                }
                else if (href || target.anchor)
                    return id ? (href = "/{localLink:" + id + "}",
                        void insertLink()) : (href || (href = ""),
                            href.indexOf("@") > 0 && -1 === href.indexOf("//") && -1 === href.indexOf(":") ? (href = "mailto:" + href,
                                void insertLink()) : /^\s*www\./i.test(href) ? (href = "http://" + href,
                                    void insertLink()) : void insertLink());
                editor.execCommand("unlink")
            }

            ConfigureScheduleOption(_contentEditingHelper);
        }]);

    function formatItemDate(item) {

        if (item.createDate)
            item.createDate = _filter('date')(new Date(item.createDate), "yyyy-MM-dd hh:mm a");

        if (item.updateDate)
            item.updateDate = _filter('date')(new Date(item.updateDate), "yyyy-MM-dd hh:mm a");
        return item;
    }

    function beforeSave(request) {
        if (request.data && request.data.value) {
            var reqVal = request.data.value;
            var errorArr = [];
            var action = reqVal.action.toLowerCase();
            var contentTypeAlias = reqVal.contentTypeAlias;
            if (action) {
                var data = reqVal.variants;
                if (data) {
                    data = data.filter(x => x.name && (x.save || x.publish));
                    var length = data.length;
                    var val, obj;
                    // Update booklet status AND validate
                    if (contentTypeAlias === "booklet") {
                        var bookletErrors = validateAndUpdateBooklet(data);
                        if (bookletErrors && bookletErrors.length > 0) {
                            errorArr = errorArr.concat(bookletErrors);
                        }
                    }

                    // loop on properties for every language
                    for (var i = 0; i < length; i++) {
                        obj = data[i];
                        if (obj.properties) {
                            val = obj.properties.filter(x => x.alias.toLowerCase() === externalURLAlias.toLowerCase())[0];
                            if (val && !validateURL(val.value)) {
                                errorArr.push("External URL is not of the allowed URI schemes (http,https) for value " + val.value);
                            }
                            val = obj.properties.filter(x => x.alias === 'youtubeURL')[0];
                            if (val && obj.culture === "en-US" && !validateYoutubeURL(val.value)) {
                                errorArr.push("YouTube Url is not in a recognized format.");
                            }

                            //validate items in main nav menu in siteSettings
                            var errorsMenu = validateMainNavMenu(contentTypeAlias, obj);
                            var errorFooterMenu = validateFooterNavMenu(contentTypeAlias, obj);
                            if (errorFooterMenu && errorFooterMenu.length > 0) {
                                errorArr = errorArr.concat(errorFooterMenu);
                            }
                            if (errorsMenu && errorsMenu.length > 0) {
                                errorArr = errorArr.concat(errorsMenu);
                            }
                        }
                        validateRichTextEditor(obj, contentTypeAlias);
                    }

                    // Validate Files
                    var errors = validateFiles(contentTypeAlias);
                    if (errors && errors.length > 0) {
                        errorArr = errorArr.concat(errors);
                    }
                }

                if (errorArr.length > 0) {
                    request.data.value.action = action === 'publishnew' ? "saveNew" : action;
                }
            }
            return errorArr;
        }
    }

    function validateMainNavMenu(contentTypeAlias, obj) {
        var errors = [];
        if (contentTypeAlias === 'siteSettings') {
            val = obj.properties.filter(x => x.alias === 'menu')[0].value;
            var errorNameReq = "Name field in any item";
            //validate the items in in main nav menu in siteSettings
            if (val && val.items && val.items.length > 0) {
                for (var index = 0; index < val.items.length; index++) {
                    var parentItem = val.items[index];
                    //validate the parent name of the item in the menu
                    if (!parentItem.name) {
                        if (!errors.some(element => {
                            return element.toLowerCase().includes(errorNameReq.toLowerCase());
                        })) {
                            errors.push("Name field in any item of the menu is required for " + cultures[obj.culture]);
                        }
                    }
                    else {
                        //validate the Child name of the parent item in the menu
                        if (parentItem && parentItem.items && parentItem.items?.length > 0) {

                            for (var childIndex = 0; childIndex < parentItem.items.length; childIndex++) {
                                var childItem = parentItem.items[childIndex];

                                //validate the child name of the item parent in the menu
                                if (!childItem.name) {
                                    if (!errors.some(element => {
                                        return element.toLowerCase().includes(errorNameReq.toLowerCase());
                                    })) {
                                        errors.push("Name field in any item of the menu is required for " + cultures[obj.culture]);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        return errors;
    }
    function validateFooterNavMenu(contentTypeAlias, obj) {
        var errors = [];
        if (contentTypeAlias === 'siteSettings') {
            val = obj.properties.filter(x => x.alias === 'footer')[0].value;
            var errorNameReq = "Name field in any item";
            //validate the items in in main nav menu in siteSettings
            if (val && val.items && val.items.length > 0) {
                for (var index = 0; index < val.items.length; index++) {
                    var parentItem = val.items[index];
                    //validate the parent name of the item in the menu
                    if (!parentItem.name) {
                        if (!errors.some(element => {
                            return element.toLowerCase().includes(errorNameReq.toLowerCase());
                        })) {
                            errors.push("Name field in any item of the Footer menu is required for " + cultures[obj.culture]);
                        }
                    }

                }
            }
        }
        return errors;
    }
    function validateFiles(contentTypeAlias) {
        var errors = [];
        var files = _fileManager.getFiles();
        if (files) {
            var len = files.length, file;
            var alias, extension, nodeName;
            for (var j = 0; j < len; j++) {
                file = files[j] ? files[j].file : null;
                alias = files[j].alias;
                if (file && file.type && file.name) {
                    extension = getFileExtension(file.name);
                    nodeName = GetFieldName(alias);

                    if (file.name.length > maxFileNameLen) {
                        errors.push("File name for property " + nodeName + " exceed maximum allowed length of " + maxFileNameLen + " letter.");
                    }
                    else if (alias === "attachment") {
                        if (docType != extension) {
                            errors.push("Please provide a valid PDF file for property " + nodeName);
                        }
                        else if (file.size > DocSize) {
                            errors.push(`You can only upload PDF file less than or equal ${maxDocSize} MB for property ${nodeName}`);
                        }
                    }
                    else if (file.type.startsWith('video') || alias === "video") {
                        if (!validVideoTypes.includes(extension)) {
                            errors.push(`Please provide a valid MP4 or WEBM file for property ${nodeName} ${(files[j].culture) ? "for " + cultures[files[j].culture] : ""}`);
                        }
                        else if (file.size > videoSize) {
                            errors.push(`You can only upload video less than or equal ${maxVideoSize} MB for property ${nodeName} ${(files[j].culture) ? "for " + cultures[files[j].culture] : ""}`);
                        }
                    }
                    else if (file.type.startsWith('image')) {
                        var v = validateImageFormat(file.name, alias, contentTypeAlias, nodeName);
                        if (!v.valid) {
                            errors.push(v.msg);
                        }
                        else if (file.size > ImgSize) {
                            errors.push(`You can only upload image less than or equal ${maxImageSize} MB for property ${nodeName}`);
                        }
                    }
                }
                else {
                    errors.push("Invalid uploaded file.");
                }
            }
        }

        return errors;
    }
    function validateURL(url) {
        if (!url) return true;
        try {
            var valid = new URL(url.trim()) ? 1 : 0;
            return valid && (url.startsWith("http://") || url.startsWith("https://"));
        } catch (e) {
            return false;
        }
    }
    function validateYoutubeURL(url) {
        if (!url) return true;

        return url.match(new RegExp("^https://www.youtube.com/watch[?]v=.+$")) || url.match(new RegExp("^https://youtu.be/.+$")) || url.match(new RegExp("^https://www.youtube.com/embed/.+$"));
    }
    function GetFieldName(alias) {
        var nodeName = $(`[For="${alias}"]:first`).text().replace('*', '');
        return nodeName;
    }

    function validateRichTextEditor(content, contentTypeAlias) {
        var errors = [];
        var properties = content?.properties;
        if (content && properties) {
            for (var i = 0; i < properties.length; i++) {
                var prop = properties[i];
                if (prop.value && prop.value.markup) {
                    var propertyAlias = prop.alias;
                    var rte = document.getElementById(propertyAlias);
                    // check if property is RTE
                    var rteCloset = rte?.closest("umb-rte-property-editor");

                    if (rte && rteCloset) {
                        if (IsTextHaveBaseImages(prop.value.markup)) {
                            errors.push(`Please select images from Media Picker for ${propertyAlias} in ${cultures[content.culture]}`);
                        }

                        prop.value = updateMediaUrlsInRTE(prop.value.markup);
                    }
                }
            }
        }
        return errors;
    }
    function IsTextHaveBaseImages(value) {
        var createdDiv = document.createElement("div");
        createdDiv.innerHTML = value;

        var images = createdDiv.getElementsByTagName('img');
        if (images && images.length > 0) {
            for (var i = 0; i < images.length; i++) {
                if (images[i].src.includes(";base64,")) {
                    return true;
                }
            }
        }
        return false;
    }
    function updateMediaUrlsInRTE(value) {
        if (value) {
            var createdDiv = document.createElement("div");
            createdDiv.innerHTML = value;

            var links = createdDiv.getElementsByTagName('a');
            if (links && links.length > 0) {
                var a;
                for (var i = 0; i < links.length; i++) {
                    a = links[i];
                    if (a.href && a.href.includes("/media/")) {
                        a.href = a.href.includes(_baseUrl) ? a.href : _baseUrl + a.href;
                    }

                }
            }
            return createdDiv.innerHTML;
        }
        return value;
    }

    function validateAndUpdateBooklet(data) {
        var validationErrors = [];

        for (var i = 0; i < data.length; i++) {
            var properties = data[i].properties;

            // Find the bookletVersionList property
            var bookletVersionProp = properties.find(x => x.alias === "bookletVersionList");

            if (!bookletVersionProp || !bookletVersionProp.value || !bookletVersionProp.value.contentData) {
                continue;
            }

            var contentData = bookletVersionProp.value.contentData;

            // Skip if no content data
            if (!contentData || contentData.length === 0) {
                continue;
            }

            // Track for duplicate detection and empty year validation
            var versionYearCounts = {};
            var versionYears = [];
            var allLanguageGuids = [];
            var emptyYearCount = 0;
            var filledYearCount = 0;

            // Process each version
            contentData.forEach(function (item, versionIndex) {
                // Extract and validate version year
                var versionYear = null;
                var hasEmptyYear = false;

                if (item.bookletVersionYear) {
                    versionYear = parseInt(item.bookletVersionYear, 10);

                    if (versionYear && !isNaN(versionYear) && versionYear > 0) {
                        versionYears.push(versionYear.toString());
                        filledYearCount++;

                        // Track for duplicate detection
                        if (versionYearCounts[versionYear]) {
                            versionYearCounts[versionYear]++;
                        } else {
                            versionYearCounts[versionYear] = 1;
                        }
                    } else {
                        hasEmptyYear = true;
                        emptyYearCount++;
                    }
                } else {
                    hasEmptyYear = true;
                    emptyYearCount++;
                }

                // Process bookletFlipFolder
                if (item.bookletFlipFolder && item.bookletFlipFolder.contentData) {
                    var flipFolderData = item.bookletFlipFolder.contentData;
                    var languageGuidsInVersion = [];
                    var languageGuidCountsInVersion = {};

                    flipFolderData.forEach(function (flip, flipIndex) {
                        // Set default booklet status if not set (original logic)
                        if (!flip.bookletStatus) {
                            flip.bookletStatus = "New";
                        }

                        // Extract language GUID
                        if (flip.bookletLanguage) {
                            var languageGuid = extractLanguageGuid(flip.bookletLanguage);

                            if (languageGuid) {
                                // Track for overall filtered property
                                allLanguageGuids.push(languageGuid);

                                // Track for duplicate detection within this version
                                languageGuidsInVersion.push(languageGuid);

                                if (languageGuidCountsInVersion[languageGuid]) {
                                    languageGuidCountsInVersion[languageGuid]++;
                                } else {
                                    languageGuidCountsInVersion[languageGuid] = 1;
                                }
                            }
                        }
                    });

                    // Check for duplicate languages in this version
                    // This validation applies regardless of whether the version has a year or not
                    var duplicateLanguagesCount = 0;
                    for (var guid in languageGuidCountsInVersion) {
                        if (languageGuidCountsInVersion[guid] > 1) {
                            duplicateLanguagesCount++;
                        }
                    }

                    if (duplicateLanguagesCount > 0) {
                        // Show appropriate message based on whether version has a year
                        var versionYearText = versionYear ? " in version year " + versionYear : " in the booklet version";
                        validationErrors.push("Duplicate language(s) detected" + versionYearText +
                            ". Each language must be unique within a version. Found " +
                            duplicateLanguagesCount + " duplicate language(s).");
                    }
                }
            });

            // VALIDATION 1: If there's an empty year, it must be the only version
            // You can have ONE version without a year, but not multiple
            if (emptyYearCount > 0 && contentData.length > 1) {
                validationErrors.push("A booklet version without a year can only exist if it's the only version. " +
                    "Please either add a year to all versions or keep only one version without a year.");
            }

            // VALIDATION 2: Cannot mix empty years with filled years
            // This validation is additional
            else if (emptyYearCount > 0 && filledYearCount > 0) {
                validationErrors.push("Cannot mix booklet versions with years and versions without years. " +
                    "All versions must either have years or none should have years.");
            }

            // Check for duplicate version years (only if there are filled years)
            if (filledYearCount > 0) {
                var duplicateYears = [];
                for (var year in versionYearCounts) {
                    if (versionYearCounts[year] > 1) {
                        duplicateYears.push(year);
                    }
                }

                if (duplicateYears.length > 0) {
                    validationErrors.push("Duplicate booklet version year(s) detected: " +
                        duplicateYears.join(", ") +
                        ". Each version year must be unique.");
                }
            }

            // Update versionYearsFiltered property
            var versionYearsFilteredProp = properties.find(function (p) {
                return p.alias === 'versionYearsFiltered';
            });

            if (versionYearsFilteredProp) {
                versionYearsFilteredProp.value = versionYears.join(' ');
            }

            // Update languagesFiltered property (remove duplicates)
            var languagesFilteredProp = properties.find(function (p) {
                return p.alias === 'languagesFiltered';
            });

            if (languagesFilteredProp) {
                var uniqueLanguages = allLanguageGuids.filter(function (value, index, self) {
                    return self.indexOf(value) === index;
                });
                languagesFilteredProp.value = uniqueLanguages.join(',');
            }
        }

        // Return validation errors (will be handled by beforeSave function)
        return validationErrors;
    }
    function extractLanguageGuid(languageValue) {
        if (!languageValue) {
            return null;
        }

        var languageStr = languageValue.toString();

        // Handle umb://document/guid format
        if (languageStr.startsWith("umb://document/")) {
            var guidPart = languageStr.substring("umb://document/".length);
            return formatGuid(guidPart.toLowerCase());
        }

        // If it's already a GUID format, return it
        return formatGuid(languageStr.toLowerCase());
    }

    function formatGuid(guidString) {
        if (!guidString || typeof guidString !== 'string') {
            return guidString;
        }

        // Remove any existing hyphens first
        var cleanGuid = guidString.replace(/-/g, '');

        // Check if it's a valid GUID length (32 characters without hyphens)
        if (cleanGuid.length !== 32) {
            return guidString; // Return as-is if not valid length
        }

        // Format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
        // Pattern: 8-4-4-4-12
        return cleanGuid.substring(0, 8) + '-' +
            cleanGuid.substring(8, 12) + '-' +
            cleanGuid.substring(12, 16) + '-' +
            cleanGuid.substring(16, 20) + '-' +
            cleanGuid.substring(20, 32);
    }

})();

function getInnerText(rteVal) {
    if (!rteVal || !rteVal.markup)
        return "";
    var div = document.createElement("div");
    div.innerHTML = rteVal.markup;
    return div.innerText.trim();
}

function TrimStr(str) {
    return str == null ? '' : str.trim();
}
function OpenURL(url) {
    var a = createHyperLink('_OpenUrlLink');
    a.setAttribute('href', url);
    a.click();
}
function Download(url) {
    var a = createHyperLink('_DownloadlLink', 1);
    a.setAttribute('href', url);
    a.click();
}
function createHyperLink(id, download) {
    var a = document.getElementById(id);
    if (a === null) {
        a = document.createElement('a');
        a.setAttribute('id', id);
        a.setAttribute('target', '_blank');
        a.setAttribute('rel', "noopener noreferrer");
        if (download) {
            a.setAttribute('download', '');
        }
        document.body.appendChild(a);
    }
    return a;
}

function getContentId() {
    var id = 0;
    var indx = location.href.indexOf('/edit/');
    if (indx > -1) {
        var tmp = location.href.substring(indx + 6);
        if (tmp) {
            tmp = tmp.split('?')[0];
            if (!isNaN(tmp)) id = parseInt(tmp);
        }
    }
    return id;
}
function getLanguage() {
    var langSelect = document.querySelector(".umb-variant-switcher__toggle>span");
    var lang = 'en';
    if (langSelect)
        lang = langSelect.innerText.trim().substring(0, 2).toLowerCase();
    return lang;
}
function validateImageFormat(fileName, propAlias, contentAlias, name) {
    if (!fileName)
        return { valid: true };
    var ext = getFileExtension(fileName);
    var res = {};
    if ((contentAlias && customImages.includes(contentAlias + '_' + propAlias)) || propAlias == "umbracoFile") {
        res.valid = ext && (validImageTypes.includes(ext) || ext === ".png");
        if (!res.valid)
            res.msg = "Please provide a valid JPG, PNG or webp file for property " + name;
    }
    else if (contentAlias && customPngImages.includes(contentAlias + '_' + propAlias)) {
        res.valid = ext && (ext === ".webp" || ext === ".png");
        if (!res.valid)
            res.msg = "Please provide a valid PNG or webp file for property " + name;
    }
    else {
        res.valid = ext && validImageTypes.includes(ext);
        if (!res.valid)
            res.msg = "Please provide a valid JPG or webp file for property " + name;
    }
    return res;
}
function getFileExtension(fileName) {
    if (!fileName)
        return "";
    return fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
}

function filterNotifications(response) {
    var notifications = response?.data?.notifications;
    if (notifications && notifications.length > 0 && notifications.findIndex(n => n.type == "Error") > 0) {
        response.data.notifications = notifications.filter(n => n.type !== "Success");
    }
    response.data.notifications.forEach((n) => {
        if (response.data.variants && response.data.variants.length > 0) {
            let contentName = response.data.variants[0].name;
            n.message = `All languages for ${contentName} are now unpublished.`;
        }
    });
    return response;
}

function ConfigureScheduleOption(_contentEditingHelper) {
    _contentEditingHelper.configureContentEditorButtons = function (args) {
        if (!Utilities.isObject(args))
            throw "args must be an object";
        if (!args.content)
            throw "args.content is not defined";
        if (!args.methods)
            throw "args.methods is not defined";
        if (!(args.methods.saveAndPublish && args.methods.sendToPublish && args.methods.unpublish && args.methods.schedulePublish && args.methods.publishDescendants))
            throw "args.methods does not contain all required defined methods";
        var buttons = {
            defaultButton: null,
            subButtons: []
        };
        function createButtonDefinition(ch) {
            switch (ch) {
                case "U":
                    return {
                        letter: ch,
                        labelKey: "buttons_saveAndPublish",
                        handler: args.methods.saveAndPublish,
                        hotKey: "ctrl+p",
                        hotKeyWhenHidden: !0,
                        alias: "saveAndPublish",
                        addEllipsis: args.content.variants && args.content.variants.length > 1 ? "true" : "false"
                    };
                case "H":
                    return {
                        letter: ch,
                        labelKey: "buttons_saveToPublish",
                        handler: args.methods.sendToPublish,
                        hotKey: "ctrl+p",
                        hotKeyWhenHidden: !0,
                        alias: "sendToPublish",
                        addEllipsis: args.content.variants && args.content.variants.length > 1 ? "true" : "false"
                    };
                case "Z":
                    return {
                        letter: ch,
                        labelKey: "content_unpublish",
                        handler: args.methods.unpublish,
                        hotKey: "ctrl+u",
                        hotKeyWhenHidden: !0,
                        alias: "unpublish",
                        addEllipsis: "true"
                    };
                case "SCHEDULE":
                    return {
                        letter: ch,
                        labelKey: "buttons_schedulePublish",
                        handler: args.methods.schedulePublish,
                        hotKey: "alt+shift+s",
                        hotKeyWhenHidden: !0,
                        alias: "schedulePublish",
                        addEllipsis: "true"
                    };
                case "PUBLISH_DESCENDANTS":
                    return {
                        letter: ch,
                        labelKey: "buttons_publishDescendants",
                        handler: args.methods.publishDescendants,
                        hotKey: "alt+shift+p",
                        hotKeyWhenHidden: !0,
                        alias: "publishDescendant",
                        addEllipsis: "true"
                    };
                default:
                    return null
            }
        }
        var hasSchedule = allowedSchedule.includes(args.content.contentTypeAlias);

        buttons.subButtons = [];
        var buttonOrder = ["U", "H", "SCHEDULE", "PUBLISH_DESCENDANTS"];
        if (!args.create || _.contains(args.content.allowedActions, "C")) {
            for (var b in buttonOrder)
                if (_.contains(args.content.allowedActions, buttonOrder[b])) {
                    buttons.defaultButton = createButtonDefinition(buttonOrder[b]);
                    break
                }
            !buttons.defaultButton && args.create && _.contains(args.content.allowedActions, "C") && (buttons.defaultButton = createButtonDefinition("A"))
        }
        if (buttons.defaultButton) {
            for (var i = _.indexOf(buttonOrder, buttons.defaultButton.letter) + 1; i < buttonOrder.length; i++)
                _.contains(args.content.allowedActions, buttonOrder[i]) && (hasSchedule && buttons.subButtons.push(createButtonDefinition(buttonOrder[i])));
            if (_.contains(args.content.allowedActions, "U") && (hasSchedule && buttons.subButtons.push(createButtonDefinition("SCHEDULE")),
                buttons.subButtons.push(createButtonDefinition("PUBLISH_DESCENDANTS"))),
                !args.create)
                args.content.variants.filter(function (variant) {
                    return "Published" === variant.state || "PublishedPendingChanges" === variant.state
                }).length > 0 && _.contains(args.content.allowedActions, "U") && _.contains(args.content.allowedActions, "Z") && buttons.subButtons.push(createButtonDefinition("Z"))
        }
        return buttons
    }
}