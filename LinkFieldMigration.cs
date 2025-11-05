using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Linq;
using Umbraco.Cms.Core.Composing;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Infrastructure.Scoping;

namespace UmbracoDemo
{
    public class LinkFieldMigration : IComposer
    {
        public void Compose(IUmbracoBuilder builder)
        {
            builder.Components().Append<LinkFieldMigrationComponent>();
        }
    }

    public class LinkFieldMigrationComponent(
        IScopeProvider scopeProvider,
        IContentService contentService,
        ILogger<LinkFieldMigrationComponent> logger,
        IConfiguration configuration) : IComponent
    {
        private readonly IScopeProvider _scopeProvider = scopeProvider;
        private readonly IContentService _contentService = contentService;
        private readonly ILogger<LinkFieldMigrationComponent> _logger = logger;
        private readonly IConfiguration _configuration = configuration;

        public void Initialize()
        {
            using var scope = _scopeProvider.CreateScope();

            var baseUrl = _configuration["appSettings:FrontBaseUrl"] ?? string.Empty;
            var contentTypeIdsSetting = _configuration["appSettings:ContentTypeIds"];

            if (string.IsNullOrWhiteSpace(contentTypeIdsSetting))
            {
                _logger.LogWarning("No content type IDs configured in appSettings:ContentTypeIds.");
                return;
            }

            var contentTypeIds = contentTypeIdsSetting
                .Split(',', StringSplitOptions.RemoveEmptyEntries)
                .Select(idStr => int.TryParse(idStr, out var id) ? id : 0)
                .Where(id => id > 0)
                .ToList();

            _logger.LogInformation("Starting link field migration for content types: {Ids}", string.Join(", ", contentTypeIds));

            foreach (var contentTypeId in contentTypeIds)
            {
                try
                {
                    var contents = _contentService.GetPagedOfType(contentTypeId, 0, int.MaxValue, out var total, null!);

                    _logger.LogInformation("Found {Count} items for content type ID {TypeId}", total, contentTypeId);

                    foreach (var content in contents)
                    {
                        try
                        {
                            if (content == null)
                                continue;

                            var contentSectionsProp = content.Properties["contentSections"];
                            if (contentSectionsProp?.Values == null)
                                continue;

                            foreach (var propValue in contentSectionsProp.Values)
                            {
                                if (propValue?.EditedValue == null)
                                    continue;

                                JObject editedValue;
                                try
                                {
                                    editedValue = JObject.Parse(propValue.EditedValue.ToString() ?? "{}");
                                }
                                catch (Exception ex)
                                {
                                    _logger.LogError(ex, "Failed to parse JSON for content ID {Id}", content.Id);
                                    continue;
                                }

                                if (editedValue["contentData"] is not JArray contentData)
                                    continue;

                                foreach (var dataItem in contentData)
                                {
                                    if (dataItem == null)
                                        continue;
                                    var redirectURL = dataItem["redirectURL"]?.ToString();
                                    if (string.IsNullOrEmpty(redirectURL))
                                        continue;

                                    var isExternal = true;
                                    var internalPageUrl = string.Empty;
                                    var internalPageId = 0;
                                    var internalPageTitle = string.Empty;

                                    if (!string.IsNullOrEmpty(baseUrl) && redirectURL.StartsWith(baseUrl, StringComparison.OrdinalIgnoreCase))
                                    {
                                        internalPageUrl = redirectURL[baseUrl.Length..];
                                        isExternal = false;

                                        string lastPart;
                                        int lastSlashIndex = internalPageUrl.LastIndexOf('/');

                                        if (lastSlashIndex == internalPageUrl.Length - 1)
                                        {
                                            // If URL ends with '/', find the previous slash
                                            int prevSlashIndex = internalPageUrl.LastIndexOf('/', lastSlashIndex - 1);
                                            lastPart = internalPageUrl[(prevSlashIndex + 1)..lastSlashIndex];
                                        }
                                        else
                                        {
                                            // Otherwise, take the part after the last slash
                                            lastPart = internalPageUrl[(lastSlashIndex + 1)..];
                                        }
                                        if (Guid.TryParse(lastPart, out var parsedGuid))
                                        {
                                            var internalPageContent = _contentService.GetById(parsedGuid);
                                            if (internalPageContent != null)
                                            {
                                                internalPageId = internalPageContent.Id;
                                                internalPageTitle = internalPageContent.Name ?? string.Empty;
                                            }
                                            else
                                            {
                                                _logger.LogWarning("No content found for GUID {Guid} (redirectURL: {Url})", parsedGuid, redirectURL);
                                            }
                                        }
                                    }

                                    var newValue = isExternal
                                        ? JToken.FromObject(new
                                        {
                                            Title = propValue.Culture == "en-us" ? "explore" : "اكتشف المزيد",
                                            linkType = "External",
                                            InternalPage = "",
                                            ExternalUrl = redirectURL,
                                            InternalPageUrl = ""
                                        })
                                        : JToken.FromObject(new
                                        {
                                            Title = !string.IsNullOrEmpty(internalPageTitle)
                                                ? internalPageTitle
                                                : (propValue.Culture == "en-us" ? "explore" : "اكتشف المزيد"),
                                            linkType = "InternalContent",
                                            InternalPage = internalPageId.ToString(),
                                            ExternalUrl = "",
                                            InternalPageUrl = internalPageUrl
                                        });

                                    dataItem["contentTemplateRelatedContentLinkURL"] = newValue;
                                }

                                content.SetValue("contentSections", editedValue.ToString(), propValue.Culture);
                            }

                            if (content.Published)
                                _contentService.SaveAndPublish(content);
                            else
                                _contentService.Save(content);

                            _logger.LogInformation("Processed content: {Id} ({Name})", content.Id, content.Name);
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, "Error while processing content ID {Id}", content.Id);
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error while fetching content of type {TypeId}", contentTypeId);
                }
            }

            scope.Complete();
            _logger.LogInformation("Link field migration completed successfully.");
        }

        public void Terminate()
        {
        }
    }
}
