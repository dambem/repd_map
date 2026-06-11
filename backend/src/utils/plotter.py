import geopandas as gpd


class Plotter:
    def __init__(self):
        pass

    @staticmethod
    def get_uniques(
        df_repd: gpd.GeoDataFrame, column: str = "Technology Type", color: str = "tab20"
    ) -> set:
        """Get unique technology types from the dataframe
        Args:
            column (str, optional): Column to get unique values from. Defaults to 'Technology Type'.
            df_repd (gpd.GeoDataFrame): Geopandas dataframe of the repd dataset.
            color (str, optional): Color map to use. Defaults to 'tab20'.
        Returns:
            set: Set of unique technology types.
        """
        all_tech_types = sorted(df_repd[column].dropna().unique())
        cmap = plt.get_cmap(color, len(all_tech_types))
        colors = {tech: cmap(i) for i, tech in enumerate(all_tech_types)}
        return set(all_tech_types)

    # @staticmethod
