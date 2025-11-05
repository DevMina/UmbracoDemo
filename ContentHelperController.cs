using Microsoft.AspNetCore.Mvc;
using System.Text.RegularExpressions;
using Umbraco.Cms.Core;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Infrastructure;
using Umbraco.Cms.Web.Common.Controllers;
namespace UmbracoDemo
{
    [Route("api/content")]
    public class ContentHelperController : UmbracoApiController
    {
        private string? culture;
        private readonly IPublishedContentQuery _publishedContentQuery;
        private readonly ILogger _logger;
        public ContentHelperController(ILogger logger, IPublishedContentQuery publishedContentQuery, CultureHelper cultureHelper)
        {
            _logger = logger;
            _publishedContentQuery = publishedContentQuery;
            culture = cultureHelper.Culture;
        }

        [HttpGet("Publishedkey/{id:int}")]
        public IActionResult GetPublishedContentById(int id)
        {
            Guid correlationId = Guid.NewGuid();
            try
            {
                _logger.LogInformation("GetPublishedContentById Started", "ContentHelperController", "GetPublishedContentById", correlationId);
                var content = _publishedContentQuery.Content(id);

                return content != null ? Ok(content.Url(culture)) : Ok(string.Empty);
            }
            catch (Exception ex)
            {
                return StatusCode(500, ex);
            }
        }
    }
}
