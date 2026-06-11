def analysis_prompt(input_data: str) -> str:
    return f"""
    <ROLE>
    You are analyzing renewable energy planning documents and extracting key information.
    </ROLE>
    <TASK>
    Analyze the following document and extract relevant information about the document type, key comments, reasoning.

    If insufficient data is found, write so in the comments and set a confidence level of 0.

    Your confidence level should be an integer between 0 and 5, where 0 represents minimum confidence, and 5 total confidence. 
    Consider the document type, the clarity of the information, and the presence of any location data when determining your confidence level..
    </TASK>
    <INPUT>
    {input_data}
    </INPUT>
    Please return a structured object with the following format containing your analysis of the provided data.
    {{
        document_type: Literal["map", "report", "other"]
        comments: str
        reasoning: str
        confidence: int (Between 0 and 5)
        location: Point | None = None, northing and easting in OSGB36 format
    }}
    """


def page_identification_prompt() -> str:
    return """
    <ROLE>
    You are analyzing renewable energy planning documents and identifying the most relevant page for location extraction.
    </ROLE>
    <TASK>
    Analyze the following document and identify the page number that contains the most relevant information for location extraction.

    Consider factors such as the presence of maps, tables, or specific mentions of locations when determining the most relevant page.
    </TASK>

    Please return a structured object containing a list of identified page numbers with a comment, and confidence out of 5 for it being the dedicated site boundary information.
    [
    {
        page_number: int
        comment: str
        confidence: int (Between 0 and 5)
    }
    ]
    """
