from typing import Dict, Any

class RuleBase:
    """
    Base class for a rules engine.
    Provider-specific rule classes should inherit from this class.
    """

    def __init__(self, benefit_authorization: Dict[str, Any]):
        """
        Initialize the rules engine with benefit authorization data.

        Args:
            benefit_authorization: A dictionary containing the patient's benefit information.
        """
        self.benefit_auth = benefit_authorization
        self.patient = benefit_authorization.get("patient", {})
        self.plan = benefit_authorization.get("plan", {})
        self.copays = benefit_authorization.get("copays", {})
        self.special_rules = benefit_authorization.get("special_rules", {})

    def calculate_exam_cost(self) -> Dict[str, Any]:
        """
        Calculate the cost of an eye exam.
        This method should be implemented by subclasses.
        """
        raise NotImplementedError("Subclasses must implement calculate_exam_cost")

    def calculate_frame_cost(self, frame_retail_price: float) -> Dict[str, Any]:
        """
        Calculate the cost of a frame, including allowance and overage.
        This method should be implemented by subclasses.
        """
        raise NotImplementedError("Subclasses must implement calculate_frame_cost")

    def calculate_lens_cost(self, order: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calculate the total cost of lenses, including materials, coatings, and enhancements.
        This method should be implemented by subclasses.
        """
        raise NotImplementedError("Subclasses must implement calculate_lens_cost")

    def calculate_total_cost(self, order: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calculate the total patient cost for a complete order.
        This method can be overridden by subclasses if the total calculation is different.
        """
        total_cost = 0
        itemized_costs = []

        if "exam" in order:
            exam_cost = self.calculate_exam_cost()
            total_cost += exam_cost.get("patient_pays", 0)
            itemized_costs.append(exam_cost)

        if "frame" in order:
            frame_cost = self.calculate_frame_cost(order["frame"]["retail_price"])
            total_cost += frame_cost.get("patient_pays", 0)
            itemized_costs.append(frame_cost)
        
        if "lenses" in order:
            lens_cost = self.calculate_lens_cost(order["lenses"])
            total_cost += lens_cost.get("patient_pays", 0)
            itemized_costs.append(lens_cost)

        return {
            "total_patient_cost": total_cost,
            "itemized_costs": itemized_costs
        }

