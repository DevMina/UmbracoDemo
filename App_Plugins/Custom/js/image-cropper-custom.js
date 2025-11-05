var propertyAliases = ["image", "icon", "logo", "kPIImage1", "kPIImage2", "advantagesImage1", "advantagesImage2", "measuresImage1", "measuresImage2", "investmentImage1", "investmentImage2"];
var tabAlias = ["general", "general/content", "sectorMeasures/", "investmentIncentives/", "sectorAdvantages/", "sectorKPIs1/"];

angular.module("umbraco").controller("Umbraco.PropertyEditors.ImageCropperControllerCustom", function ($scope, fileManager, $timeout, mediaHelper) {
    
    var config = Utilities.copy($scope.model.config);
    var defaultCulture = "ar-EG";
    var secondaryCulture = "en-US";
    $scope.isfileChanged = false;
    $scope.filesSelected = function onFileSelected(value, files) {
        setModelValueWithSrc(value),
        setDirty()
        if ($scope.model.culture == defaultCulture)
            $scope.isfileChanged = true;
    }
    ,
    $scope.filesChanged = function onFilesChanged(files) {
        files && files[0] && ($scope.imageSrc = files[0].fileSrc,
        setDirty())
    }
    ,
    $scope.fileUploaderInit = function onFileUploaderInit(value, files) {
        $scope.model.value && (Utilities.isString($scope.model.value) ? setModelValueWithSrc($scope.model.value) : (_.each($scope.model.value.crops, function (saved) {
            var configured = _.find(config.crops, function (item) {
                return item.alias === saved.alias
            });
            configured && configured.height === saved.height && configured.width === saved.width && (configured.coordinates = saved.coordinates)
        }),
            $scope.model.value.crops = config.crops,
            $scope.model.value.focalPoint || ($scope.model.value.focalPoint = {
                left: .5,
                top: .5
            })),
            files && files[0] ? $scope.imageSrc = files[0].fileSrc : $scope.imageSrc = $scope.model.value.src)
    }
    ,
    $scope.imageLoaded = function imageLoaded(isCroppable, hasDimensions) {
        $scope.isCroppable = isCroppable,
        $scope.hasDimensions = hasDimensions
    }
    ,
    $scope.crop = function crop(targetCrop) {
        if ($scope.readonly)
            return;
        $scope.currentCrop ? (close(),
            $timeout(function () {
                crop(targetCrop),
                    $scope.pendingCrop = !1
            }),
            $scope.pendingCrop = !0) : ($scope.currentCrop = Utilities.copy(targetCrop),
                $scope.currentPoint = null,
                setDirty())
    }
    ,
    $scope.done = function done() {
        if (!$scope.currentCrop)
            return;
        _.find($scope.model.value.crops, crop => crop.alias === $scope.currentCrop.alias).coordinates = $scope.currentCrop.coordinates,
            $scope.close(),
            setDirty()
    }
    ,
    $scope.clear = function clear(crop) {
        fileManager.setFiles({
            propertyAlias: $scope.model.alias,
            culture: $scope.model.culture,
            segment: $scope.model.segment,
            files: []
        }),
        $scope.imageSrc = null,
        $scope.model.value && ($scope.model.value = null);
        setDirty()
        $scope.isfileChanged = false;
    }
    ,
    $scope.reset = function reset() {
        $scope.currentCrop.coordinates = void 0,
        $scope.done()
    }
    ,
    $scope.close = close,
    $scope.isCustomCrop = function isCustomCrop(crop) {
        return !!crop.coordinates
    },
    $scope.focalPointChanged = function focalPointChanged(left, top) {
        $scope.model.value.focalPoint = {
            left: left,
            top: top
        },
        setDirty()
    },
    $scope.model.onValueChanged = function onValueChanged(newVal, oldVal) {
        fileManager.setFiles({
            propertyAlias: $scope.model.alias,
            culture: $scope.model.culture,
            segment: $scope.model.segment,
            files: []
        })
    };
    var umbracoSettings = Umbraco.Sys.ServerVariables.umbracoSettings;
    function setModelValueWithSrc(src) {
        $scope.model.value && $scope.model.value.src || ($scope.model.value = Utilities.extend(Utilities.copy($scope.model.config), {
            src: src
        }))
    }
    function setDirty() {
        $scope.imageCropperForm && $scope.imageCropperForm.modelValue.$setDirty()
    }
    function close() {
        $scope.currentCrop = void 0,
        $scope.currentPoint = void 0
    }
    $scope.acceptFileExt = mediaHelper.formatFileTypes(umbracoSettings.imageFileTypes);
    var unsubscribe = $scope.$on("formSubmitting", function () {
        $scope.currentCrop = null,
        $scope.currentPoint = null
    });
    $scope.$on("$destroy", function () {
        unsubscribe();
        $scope.setDefaultImage();
    })

    $scope.setDefaultImage = function () {
        try {
            //set arabic image as default for english

            if (!$scope.model.culture || !$scope.isfileChanged || propertyAliases.indexOf($scope.model.alias) < 0)
                return;
            var variant = $scope.node.variants.filter(x => x.language.culture == defaultCulture);
            var variant2 = $scope.node.variants.filter(x => x.language.culture == secondaryCulture);
            
            if (variant[0] && variant2[0]) {
                variant = variant[0].tabs.filter(x => tabAlias.includes(x.alias) && x.properties?.length > 0);
                variant2 = variant2[0].tabs.filter(x => tabAlias.includes(x.alias) && x.properties?.length > 0);

                for (var i = 0; i < variant.length; i++) {
                    variant[i] && variant[i].properties.filter(x => x.alias == $scope.model.alias && x.culture == defaultCulture && propertyAliases.includes(x.alias)).forEach(function (mainImg) {
                        if (mainImg && mainImg.value) {
                            var files = fileManager.getFiles();
                            if (files) {
                                var imgFile = files.filter(x => x.alias == mainImg.alias && x.culture === defaultCulture)[0];
                                if (imgFile) {
                                    var engImg = variant2[i].properties.filter(x => x.alias == mainImg.alias)[0];
                                    if (engImg && !engImg.value) {
                                        engImg.value = { ...mainImg.value };
                                        
                                        fileManager.setFiles({
                                            propertyAlias: mainImg.alias,
                                            culture: secondaryCulture,
                                            segment: null,
                                            files: [imgFile.file]
                                        })

                                        $scope.isfileChanged = false;
                                    }
                                }
                            }
                        }
                    });
                }

            }
        } catch (e) {
            console.log(e);
        }
    }
}).run(function (mediaHelper, umbRequestHelper) {
    mediaHelper && mediaHelper.registerFileResolver && mediaHelper.registerFileResolver("Umbraco.ImageCropper", function (property, entity, thumbnail) {
        return property.value && property.value.src ? !0 === thumbnail ? mediaHelper.getThumbnailFromPath(property.value.src) : property.value.src : Utilities.isString(property.value) ? thumbnail ? mediaHelper.detectIfImageByExtension(property.value) ? umbRequestHelper.getApiUrl("imagesApiBaseUrl", "GetBigThumbnail", [{
            originalImagePath: property.value
        }]) : null : property.value : null
    })
})