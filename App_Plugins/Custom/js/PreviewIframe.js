
var myDictionary = {
    "home": "/${culture}",
    "newsItem": "/${culture}/newsItem/${key}",
    "news": "/${culture}/newsItem/",
    "announcement": "/${culture}/announcement/${key}",
    "announcements": "/${culture}/announcement/",
    "contentTemplate1": "/${culture}/contenttemplate/${key}",
    "simpleTemplate": "/${culture}/contenttemplate/${key}",
    "template3": "/${culture}/contenttemplate/${key}",
    "event": "/${culture}/event/${key}",
    "events": "/${culture}/event/",
    "fAQ": "/${culture}/fAQ/${key}",
    "fAQs": "/${culture}/fAQ/",
    "contentTemplate": "/${culture}/contenttemplate/${key}",
    "whoWeAre": "/${culture}/contenttemplate/${key}",
    "contactUs": "/${culture}/contactus",
    "sitemaphtml": "/${culture}/sitemaphtml/${key}",
    "photoAlbums": "/${culture}/photoAlbum",
    "videoAlbums": "/${culture}/videoAlbum",
    "publications": "/${culture}/publication",
    "publication": "/${culture}/publication/${key}",
    "egyptIsReady": "/${culture}/egyptIsReadyItem",
    "egyptIsReadyItem": "/${culture}/egyptIsReadyItem/${key}",
    "mediaCenter": "/${culture}/mediaCenterItem",
    "sector": "/${culture}/sector/${key}",
    "sectors": "/${culture}/sector",
    "contentTemplate3": "/${culture}/contenttemplate/${key}",
    "contentTemplate4": "/${culture}/contenttemplate/${key}",
    "contentTemplateDetails": "/${culture}/contenttemplate/${key}",
    "contentTemplateDetailsPage": "/${culture}/contenttemplate/${key}",
    "partners": "/${culture}/partner",
    "partner": "/${culture}/partner/${key}",
    "successStories": "/${culture}/successStory",
    "successStory": "/${culture}/successStory/${key}",
    "tesmonials": "/${culture}/testmonial",
    "testmonial": "/${culture}/testmonial/${key}",
    "whatGafiOffers": "/${culture}/whatGafiOffersItem",
    "whatGafiOffersItem": "/${culture}/whatGafiOffersItem/${key}",
    "booklets": "/${culture}/booklet" 
};
var culture;
var key;

var ctx;
var loader;
var speed = 0.1;
var radius = 30;
var thickness = 8;
var angle = 0;
var overlayDiv;

$(document).ready(function () {
    debugger
    loader = createLoader();
    document.body.appendChild(loader); // or some container
    loader.show();
    getContentKey();
});

function createLoader() {
    // Inject CSS styles only once
    if (!document.getElementById('loader-styles')) {
        const style = document.createElement('style');
        style.id = 'loader-styles';
        style.textContent = `
            .loader-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: white;
                z-index: 999;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .umb-load-indicator {
                font-size: 0;
                list-style: none;
                padding: 0;
                margin: 0;
                display: flex;
                gap: 6px;
            }
            .umb-load-indicator__bubble {
                width: 12px;
                height: 12px;
                background-color: #0078d4;
                border-radius: 50%;
                animation: bounce 1s infinite ease-in-out;
            }
            .umb-load-indicator__bubble:nth-child(2) {
                animation-delay: 0.2s;
            }
            .umb-load-indicator__bubble:nth-child(3) {
                animation-delay: 0.4s;
            }
            @keyframes bounce {
                0%, 80%, 100% { transform: scale(0); }
                40% { transform: scale(1); }
            }
        `;
        document.head.appendChild(style);
    }

    // Create overlay div
    const overlay = document.createElement('div');
    overlay.className = 'loader-overlay';

    // Create UL indicator
    const ul = document.createElement('ul');
    ul.className = 'umb-load-indicator';

    // Add 3 bubbles
    for (let i = 0; i < 3; i++) {
        const li = document.createElement('li');
        li.className = 'umb-load-indicator__bubble';
        ul.appendChild(li);
    }

    // Add UL to overlay
    overlay.appendChild(ul);

    // Add helper methods
    overlay.show = () => overlay.style.display = 'flex';
    overlay.hide = () => overlay.style.display = 'none';

    overlay.hide(); // Start hidden
    return overlay;
}

function getContentKey() {

    const params = new URLSearchParams(window.location.search);
    const id = tryGetQueryId();
    culture = params.get('culture').substring(0, 2);
    var route;
    var partial;
    document.getElementById('_contentPreview').onload = function () {
        loader.hide();
    }

    $.ajax({
        url: `/api/content/key/${id}`,
        method: "GET",
        success: function (res) {
            const alias = res.data.contentType?.alias;

            if (alias && myDictionary[alias] !== undefined) {
                partial = myDictionary[res.data.contentType.alias].replace("${culture}", culture).replace("${key}", res.data.key);
                route = `${baseUrl}${partial}`;
                const ispreview = true;
                const previewparam = `preview=${ispreview}`;
                const separator = route.includes('?') ? '&' : '?';
                const finalurl = `${route}${separator}${previewparam}`;

                document.getElementById('_contentPreview').src = finalurl;
            }
            else
            {
                document.getElementById('_contentPreview').src = baseUrl + '/' + culture + '/404';
            }
        },
        error: function (err) {
            console.error("Error getting GUID from custom API", err);
        }
    });
    
    function tryGetQueryId() {
        try {
            const params = new URLSearchParams(window.location.search);
            var value = params.get('id');
            if (value)
                return value;
            var id = window.location.pathname?.substring(1);
            if (id && !isNaN(id)) {
                return id;
            }
            value = null;
            var parts = location.href.split('?');
            var temp, _value;
            parts && parts[1] && (temp = parts[1].split('&')) && (_value = temp.find(x => x.toLowerCase().includes('id=')));
            if (_value) {
                _value = _value.split('=');
                if (_value && _value.length > 1)
                    value = _value[1];
            }
            return value;
        } catch (e) {
            console.log(e);
            return null;
        }
    }
}