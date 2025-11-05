using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Primitives;

namespace UmbracoDemo
{
    public class CultureHelper
    {
        public string? Culture { get; set; }

        public string CultureName 
        {
            get
            {
                return !string.IsNullOrEmpty(Culture) ? Culture.Substring(0, Culture.IndexOf('-')) : "";
            }
        }

        public CultureHelper(IHttpContextAccessor httpContextAccessor)
        {
            var request = httpContextAccessor?.HttpContext?.Request;

            if (request != null)
            {
                StringValues language;
                request.Headers.TryGetValue("Accept-Language", out language);
                Culture = language.Count > 0 ? language[0] : null;
            }
        }

    }
}
